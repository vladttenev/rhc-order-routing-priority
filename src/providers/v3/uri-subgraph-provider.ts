import { URISubgraphProvider } from '../uri-subgraph-provider';

import { IPONSSubgraphProvider, PONSSubgraphPool } from './subgraph-provider';

export class PONSURISubgraphProvider
  extends URISubgraphProvider<PONSSubgraphPool>
  implements IPONSSubgraphProvider {}
