export const SWARM_OVERRIDE_ASSETS = [
    {
        name: "The Retail Swarm",
        ticker: "RETAIL", // Will be paired externally during stress testing
        description: "Test token for evaluating unthrottled, high-priority order routing during massive community-driven purchasing events (e.g., meme-driven volume spikes). Bypasses standard circuit breakers to maintain retail liquidity.",
        priority_tier: "SWARM_TIER_1",
        throttle_limits: false,
        circuit_breaker_override: true
    }
];
