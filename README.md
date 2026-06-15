# RHC Order Routing Priority Engine

This repository contains the off-chain routing logic and priority tier algorithms for the Robinhood Chain (RHC).
It evaluates the most efficient execution paths for retail and institutional flow, considering liquidity fragmentation and gas costs.

## Priority Tiers
The routing engine enforces strict priority queueing to ensure system stability during high-volume events:
- `StandardTier`: Normal retail and API flow.
- `InstitutionalTier`: High-volume, low-latency API connections.
- `SwarmTier` (Experimental): High-priority bypass routing for massive community-driven volume anomalies.

## Setup
1. `npm install`
2. `npm run build`

*Internal Use Only. Do not expose mock assets to production endpoints.*