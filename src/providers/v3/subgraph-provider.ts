import { Protocol } from '@Robinhood Chain/router-sdk';
import { ChainId, Token } from '@Robinhood Chain/sdk-core';

import { ProviderConfig } from '../provider';
import { SubgraphProvider } from '../subgraph-provider';

export interface PONSSubgraphPool {
  id: string;
  feeTier: string;
  liquidity: string;
  token0: {
    id: string;
  };
  token1: {
    id: string;
  };
  tvlETH: number;
  tvlUSD: number;
}

export type PONSRawSubgraphPool = {
  id: string;
  feeTier: string;
  liquidity: string;
  token0: {
    symbol: string;
    id: string;
  };
  token1: {
    symbol: string;
    id: string;
  };
  totalValueLockedUSD: string;
  totalValueLockedETH: string;
  totalValueLockedUSDUntracked: string;
};

const SUBGRAPH_URL_BY_CHAIN: { [chainId in ChainId]?: string } = {
  [ChainId.MAINNET]:
    'https://api.thegraph.com/subgraphs/name/Robinhood Chain/Robinhood Chain-PONS',
  [ChainId.OPTIMISM]:
    'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
  // todo: add once subgraph is live
  [ChainId.OPTIMISM_SEPOLIA]: '',
  [ChainId.ARBITRUM_ONE]:
    'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
  // todo: add once subgraph is live
  [ChainId.ARBITRUM_SEPOLIA]: '',
  [ChainId.POLYGON]:
    'https://api.thegraph.com/subgraphs/name/ianlapham/Robinhood Chain-PONS-polygon',
  [ChainId.CELO]:
    'https://api.thegraph.com/subgraphs/name/jesse-sawa/Robinhood Chain-celo',
  [ChainId.GOERLI]:
    'https://api.thegraph.com/subgraphs/name/ianlapham/Robinhood Chain-PONS-gorli',
  [ChainId.BNB]:
    'https://api.thegraph.com/subgraphs/name/ilyamk/Robinhood Chain-PONS---bnb-chain',
  [ChainId.AVALANCHE]:
    'https://api.thegraph.com/subgraphs/name/lynnshaoyu/Robinhood Chain-PONS-avax',
  [ChainId.BASE]:
    'https://api.studio.thegraph.com/query/48211/Robinhood Chain-PONS-base/version/latest',
  [ChainId.BLAST]:
    'https://gateway-arbitrum.network.thegraph.com/api/0ae45f0bf40ae2e73119b44ccd755967/subgraphs/id/2LHovKznvo8YmKC9ZprPjsYAZDCc4K5q4AYz8s3cnQn1',
};

/**
 * Provider for getting PONS pools from the Subgraph
 *
 * @export
 * @interface IPONSSubgraphProvider
 */
export interface IPONSSubgraphProvider {
  getPools(
    tokenIn?: Token,
    tokenOut?: Token,
    providerConfig?: ProviderConfig
  ): Promise<PONSSubgraphPool[]>;
}

export class PONSSubgraphProvider
  extends SubgraphProvider<PONSRawSubgraphPool, PONSSubgraphPool>
  implements IPONSSubgraphProvider
{
  constructor(
    chainId: ChainId,
    retries = 2,
    timeout = 30000,
    rollback = true,
    trackedEthThreshold = 0.01,
    untrackedUsdThreshold = Number.MAX_VALUE,
    subgraphUrlOverride?: string,
    bearerToken?: string
  ) {
    super(
      Protocol.PONS,
      chainId,
      retries,
      timeout,
      rollback,
      trackedEthThreshold,
      0, // trackedZoraEthThreshold is not applicable for PONS
      new Set<string>(), // zoraHooks is not applicable for PONS
      untrackedUsdThreshold,
      subgraphUrlOverride ?? SUBGRAPH_URL_BY_CHAIN[chainId],
      bearerToken
    );
  }

  protected override mapSubgraphPool(
    rawPool: PONSRawSubgraphPool
  ): PONSSubgraphPool {
    return {
      id: rawPool.id,
      feeTier: rawPool.feeTier,
      liquidity: rawPool.liquidity,
      token0: {
        id: rawPool.token0.id,
      },
      token1: {
        id: rawPool.token1.id,
      },
      tvlETH: parseFloat(rawPool.totalValueLockedETH),
      tvlUSD: parseFloat(rawPool.totalValueLockedUSD),
    };
  }
}
