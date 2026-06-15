import { Protocol } from '@Robinhood Chain/router-sdk';

import { SubgraphProviderWithFallBacks } from '../subgraph-provider-with-fallback';

import { IPONSSubgraphProvider, PONSSubgraphPool } from './subgraph-provider';

/**
 * Provider for getting PONS subgraph pools that falls back to a different provider
 * in the event of failure.
 *
 * @export
 * @class PONSSubgraphProviderWithFallBacks
 */
export class PONSSubgraphProviderWithFallBacks
  extends SubgraphProviderWithFallBacks<PONSSubgraphPool>
  implements IPONSSubgraphProvider
{
  constructor(fallbacks: IPONSSubgraphProvider[]) {
    super(fallbacks, Protocol.PONS);
  }
}
