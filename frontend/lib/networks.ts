// lib/networks.ts

// --- CONFIGURATION ---
// SET YOUR DEFAULT TARGET NETWORK HERE
const TARGET_CHAIN_ID = 84532 // Base Mainnet
const TARGET_CHAIN_NAME = "Base Sepolia"

// Add all networks your app supports
const SUPPORTED_CHAINS: { [key: number]: string } = {
  // Base
  8453: "Base",
  84532: "Base Sepolia",

  // Arbitrum
  42161: "Arbitrum One",
  421614: "Arbitrum Sepolia",
  
  // Celo
  42220: "Celo",
  44787: "Celo Alfajores",

  // Lisk
  1135: "Lisk",
  4202: "Lisk Sepolia",

}


/**
 * Get the default target chain ID
 */
export function getTargetChainId(): number {
  return TARGET_CHAIN_ID
}

/**
 * Check if a chain ID is in the supported list
 * @param chainId The chain ID (string or number)
 * @returns true if the chain is supported
 */
export function isSupportedChain(chainId: string | number | undefined): boolean {
  if (!chainId) return false
  const id = Number(chainId)
  return !!SUPPORTED_CHAINS[id]
}

/**
 * Get the display name of a network
 * @param chainId The chain ID (string or number)
 * @param defaultName A fallback name if the chainId is unknown
 * @returns The name of the network
 */
export function getNetworkName(
  chainId: string | number | undefined,
  defaultName: string
): string {
  if (!chainId) return defaultName
  const id = Number(chainId)
  // Return the custom name or the default fallback
  return SUPPORTED_CHAINS[id] || defaultName
}