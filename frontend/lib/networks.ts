export const SUPPORTED_CHAINS = {
  // Mainnets
  'eip155:8453': 'Base',
  'eip155:42161': 'Arbitrum',
  'eip155:42220': 'Celo',
  'eip155:1135': 'Lisk',
  
  // Testnets
  'eip155:84532': 'Base Sepolia',
  'eip155:421614': 'Arbitrum Sepolia',
  'eip155:44787': 'Celo Alfajores',
  'eip155:4202': 'Lisk Sepolia',
} as const

// Chain IDs without the eip155 prefix
export const CHAIN_IDS = {
  // Mainnets
  BASE: 8453,
  ARBITRUM: 42161,
  CELO: 42220,
  LISK: 1135,
  
  // Testnets
  BASE_SEPOLIA: 84532,
  ARBITRUM_SEPOLIA: 421614,
  CELO_ALFAJORES: 44787,
  LISK_SEPOLIA: 4202,
} as const

// Helper to check if a CAIP network ID is supported
export function isSupportedChain(caipNetworkId: string | undefined): boolean {
  if (!caipNetworkId) return false
  return caipNetworkId in SUPPORTED_CHAINS
}

// Helper to get network name from CAIP ID
export function getNetworkName(caipNetworkId: string | undefined, fallback = "Unknown Network"): string {
  if (!caipNetworkId) return fallback
  return SUPPORTED_CHAINS[caipNetworkId as keyof typeof SUPPORTED_CHAINS] ?? fallback
}