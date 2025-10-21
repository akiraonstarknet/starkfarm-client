import { getMainnetConfig, Global, PricerFromApi } from '@strkfarm/sdk';

/**
 * Shared strategy resources to avoid creating multiple instances
 * This significantly reduces RPC overhead and memory usage
 */

// Singleton instances
let sharedConfig: ReturnType<typeof getMainnetConfig> | null = null;
let sharedPricer: PricerFromApi | null = null;
let sharedTokens: ReturnType<typeof Global.getDefaultTokens> | null = null;

/**
 * Get shared mainnet configuration
 * Creates RPC provider singleton to avoid multiple connections
 */
export function getSharedConfig() {
  if (!sharedConfig) {
    console.log('[Strategy Resources] Creating shared config...');
    sharedConfig = getMainnetConfig(process.env.NEXT_PUBLIC_RPC_URL!, 'latest');
  }
  return sharedConfig;
}

/**
 * Get shared default tokens
 * Prevents repeated calls to Global.getDefaultTokens()
 */
export function getSharedTokens() {
  if (!sharedTokens) {
    console.log('[Strategy Resources] Getting default tokens...');
    sharedTokens = Global.getDefaultTokens();
  }
  return sharedTokens;
}

/**
 * Get shared pricer instance
 * Reuses config and tokens for all strategies
 */
export function getSharedPricer() {
  if (!sharedPricer) {
    console.log('[Strategy Resources] Creating shared pricer...');
    const config = getSharedConfig();
    const tokens = getSharedTokens();
    sharedPricer = new PricerFromApi(config, tokens);
  }
  return sharedPricer;
}
