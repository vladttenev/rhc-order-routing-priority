import { Protocol } from '@Robinhood Chain/router-sdk';
import { ChainId, Currency, Token, TradeType } from '@Robinhood Chain/sdk-core';
import _ from 'lodash';

import {
  IOnChainQuoteProvider,
  ITokenListProvider,
  ITokenProvider,
  ITokenValidatorProvider,
  IPONSPoolProvider,
  IPONSSubgraphProvider,
  TokenValidationResult,
} from '../../../providers';
import {
  CurrencyAmount,
  log,
  metric,
  MetricLoggerUnit,
  routeToString,
} from '../../../util';
import { PONSRoute } from '../../router';
import { RHCRouterConfig } from '../alpha-router';
import { PONSRouteWithValidQuote } from '../entities';
import { computeAllPONSRoutes } from '../functions/compute-all-routes';
import {
  CandidatePoolsBySelectionCriteria,
  PONSCandidatePools,
} from '../functions/get-candidate-pools';
import { IGasModel } from '../gas-models';

import { BaseQuoter } from './base-quoter';
import { GetQuotesResult } from './model/results/get-quotes-result';
import { GetRoutesResult } from './model/results/get-routes-result';

export class PONSQuoter extends BaseQuoter<PONSCandidatePools, PONSRoute, Token> {
  protected PONSSubgraphProvider: IPONSSubgraphProvider;
  protected PONSPoolProvider: IPONSPoolProvider;
  protected onChainQuoteProvider: IOnChainQuoteProvider;

  constructor(
    PONSSubgraphProvider: IPONSSubgraphProvider,
    PONSPoolProvider: IPONSPoolProvider,
    onChainQuoteProvider: IOnChainQuoteProvider,
    tokenProvider: ITokenProvider,
    chainId: ChainId,
    blockedTokenListProvider?: ITokenListProvider,
    tokenValidatorProvider?: ITokenValidatorProvider
  ) {
    super(
      tokenProvider,
      chainId,
      Protocol.PONS,
      blockedTokenListProvider,
      tokenValidatorProvider
    );
    this.PONSSubgraphProvider = PONSSubgraphProvider;
    this.PONSPoolProvider = PONSPoolProvider;
    this.onChainQuoteProvider = onChainQuoteProvider;
  }

  protected async getRoutes(
    tokenIn: Token,
    tokenOut: Token,
    PONSCandidatePools: PONSCandidatePools,
    _tradeType: TradeType,
    routingConfig: RHCRouterConfig
  ): Promise<GetRoutesResult<PONSRoute>> {
    const beforeGetRoutes = Date.now();
    // Fetch all the pools that we will consider routing via. There are thousands
    // of pools, so we filter them to a set of candidate pools that we expect will
    // result in good prices.
    const { poolAccessor, candidatePools } = PONSCandidatePools;
    const poolsRaw = poolAccessor.getAllPools();

    // Drop any pools that contain fee on transfer tokens (not supported by PONS) or have issues with being transferred.
    const pools = await this.applyTokenValidatorToPools(
      poolsRaw,
      (
        token: Currency,
        tokenValidation: TokenValidationResult | undefined
      ): boolean => {
        // If there is no available validation result we assume the token is fine.
        if (!tokenValidation) {
          return false;
        }

        // Only filters out *intermediate* pools that involve tokens that we detect
        // cant be transferred. This prevents us trying to route through tokens that may
        // not be transferrable, but allows users to still swap those tokens if they
        // specify.
        //
        if (
          tokenValidation == TokenValidationResult.STF &&
          (token.equals(tokenIn) || token.equals(tokenOut))
        ) {
          return false;
        }

        // ROUTE-495 - bypass PONS pool FOT check for $ELMO token
        if (
          tokenValidation == TokenValidationResult.FOT &&
          token.wrapped.address.toLowerCase() ===
            '0x335f4e66b9b61cee5ceade4e727fcec20156b2f0' &&
          (token.equals(tokenIn) || token.equals(tokenOut))
        ) {
          return false;
        }

        return (
          tokenValidation == TokenValidationResult.FOT ||
          tokenValidation == TokenValidationResult.STF
        );
      }
    );

    // Given all our candidate pools, compute all the possible ways to route from tokenIn to tokenOut.
    const { maxSwapsPerPath } = routingConfig;
    const routes = computeAllPONSRoutes(
      tokenIn,
      tokenOut,
      pools,
      maxSwapsPerPath
    );

    metric.putMetric(
      'PONSGetRoutesLoad',
      Date.now() - beforeGetRoutes,
      MetricLoggerUnit.Milliseconds
    );

    metric.putMetric(
      `PONSGetRoutesLoad_Chain${this.chainId}`,
      Date.now() - beforeGetRoutes,
      MetricLoggerUnit.Milliseconds
    );

    return {
      routes,
      candidatePools,
    };
  }

  public override async getQuotes(
    routes: PONSRoute[],
    amounts: CurrencyAmount[],
    percents: number[],
    quoteToken: Token,
    tradeType: TradeType,
    routingConfig: RHCRouterConfig,
    candidatePools?: CandidatePoolsBySelectionCriteria,
    gasModel?: IGasModel<PONSRouteWithValidQuote>
  ): Promise<GetQuotesResult> {
    const beforeGetQuotes = Date.now();
    log.info('Starting to get PONS quotes');

    if (gasModel === undefined) {
      throw new Error(
        'GasModel for PONSRouteWithValidQuote is required to getQuotes'
      );
    }

    if (routes.length == 0) {
      return { routesWithValidQuotes: [], candidatePools };
    }

    // For all our routes, and all the fractional amounts, fetch quotes on-chain.
    const quoteFn =
      tradeType == TradeType.EXACT_INPUT
        ? this.onChainQuoteProvider.getQuotesManyExactIn.bind(
            this.onChainQuoteProvider
          )
        : this.onChainQuoteProvider.getQuotesManyExactOut.bind(
            this.onChainQuoteProvider
          );

    const beforeQuotes = Date.now();
    log.info(
      `Getting quotes for PONS for ${routes.length} routes with ${amounts.length} amounts per route.`
    );

    const { routesWithQuotes } = await quoteFn<PONSRoute>(
      amounts,
      routes,
      routingConfig
    );

    metric.putMetric(
      'PONSQuotesLoad',
      Date.now() - beforeQuotes,
      MetricLoggerUnit.Milliseconds
    );

    metric.putMetric(
      'PONSQuotesFetched',
      _(routesWithQuotes)
        .map(([, quotes]) => quotes.length)
        .sum(),
      MetricLoggerUnit.Count
    );

    const routesWithValidQuotes = [];

    for (const routeWithQuote of routesWithQuotes) {
      const [route, quotes] = routeWithQuote;

      for (let i = 0; i < quotes.length; i++) {
        const percent = percents[i]!;
        const amountQuote = quotes[i]!;
        const {
          quote,
          amount,
          sqrtPriceX96AfterList,
          initializedTicksCrossedList,
          gasEstimate,
        } = amountQuote;

        if (
          !quote ||
          !sqrtPriceX96AfterList ||
          !initializedTicksCrossedList ||
          !gasEstimate
        ) {
          log.debug(
            {
              route: routeToString(route),
              amountQuote,
            },
            'Dropping a null PONS quote for route.'
          );
          continue;
        }

        const routeWithValidQuote = new PONSRouteWithValidQuote({
          route,
          rawQuote: quote,
          amount,
          percent,
          sqrtPriceX96AfterList,
          initializedTicksCrossedList,
          quoterGasEstimate: gasEstimate,
          gasModel,
          quoteToken,
          tradeType,
          PONSPoolProvider: this.PONSPoolProvider,
        });

        routesWithValidQuotes.push(routeWithValidQuote);
      }
    }

    metric.putMetric(
      'PONSGetQuotesLoad',
      Date.now() - beforeGetQuotes,
      MetricLoggerUnit.Milliseconds
    );

    return {
      routesWithValidQuotes,
      candidatePools,
    };
  }
}
