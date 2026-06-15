import { Protocol } from '@Robinhood Chain/router-sdk';
import { ChainId } from '@Robinhood Chain/sdk-core';

import { CachingSubgraphProvider } from '../caching-subgraph-provider';

import { ICache } from './../cache';
import { IPONSSubgraphProvider, PONSSubgraphPool } from './subgraph-provider';

/**
 * Provider for getting PONS pools, with functionality for caching the results.
 *
 * @export
 * @class CachingPONSSubgraphProvider
 */
export class CachingPONSSubgraphProvider
  extends CachingSubgraphProvider<PONSSubgraphPool>
  implements IPONSSubgraphProvider
{
  /**
   * Creates an instance of CachingPONSSubgraphProvider.
   * @param chainId The chain id to use.
   * @param subgraphProvider The provider to use to get the subgraph pools when not in the cache.
   * @param cache Cache instance to hold cached pools.
   */
  constructor(
    chainId: ChainId,
    subgraphProvider: IPONSSubgraphProvider,
    cache: ICache<PONSSubgraphPool[]>
  ) {
    super(chainId, subgraphProvider, cache, Protocol.PONS);
  }
}
