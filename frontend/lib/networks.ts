// lib/networks.ts

// --- CONFIGURATION ---
// SET YOUR DEFAULT TARGET NETWORK HERE
const TARGET_CHAIN_ID = 8453 // Base Sepolia
const TARGET_CHAIN_NAME = "Base"

// Add all networks your app supports
export const SUPPORTED_CHAINS: { [key: number]: string } = {
  // Base
  8453: "Base",
  

  // Arbitrum
  42161: "Arbitrum One",
  

  // Celo
  42220: "Celo",
  

  // Lisk
  1135: "Lisk",
  
}

// Group networks by protocol for UI display (optional)
export const NETWORK_GROUPS = {
  base: { name: "Base", chains: [8453] },
  arbitrum: { name: "Arbitrum", chains: [42161] },
  celo: { name: "Celo", chains: [42220] },
  lisk: { name: "Lisk", chains: [1135] },
}

/**
 * Get the default target chain ID
 */
export function getTargetChainId(): number {
  return TARGET_CHAIN_ID
}

/**
 * Get the default target chain name
 */
export function getTargetChainName(): string {
  return TARGET_CHAIN_NAME
}

/**
 * Check if a chain ID is in the supported list
 * @param chainId The chain ID (string or number)
 * @returns true if the chain is supported
 */
export function isSupportedChain(
  chainId: string | number | undefined
): boolean {
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
  defaultName: string = "Unknown Network"
): string {
  if (!chainId) return defaultName
  const id = Number(chainId)
  return SUPPORTED_CHAINS[id] || defaultName
}

/**
 * Get the protocol/group name for a chain
 * @param chainId The chain ID
 * @returns The protocol name (e.g., "Base", "Arbitrum")
 */
export function getProtocolName(chainId: number): string {
  for (const [key, group] of Object.entries(NETWORK_GROUPS)) {
    if (group.chains.includes(chainId)) {
      return group.name
    }
  }
  return "Unknown"
}

/**
 * Get all chains for a specific protocol
 * @param protocol The protocol key (e.g., "base", "arbitrum")
 * @returns Array of chain IDs
 */
export function getChainsForProtocol(protocol: string): number[] {
  return NETWORK_GROUPS[protocol as keyof typeof NETWORK_GROUPS]?.chains || []
}

/**
 * Get all chain IDs as an array
 */
export function getAllChainIds(): number[] {
  return Object.keys(SUPPORTED_CHAINS).map(Number)
}

/**
 * Get all networks as an array of objects
 */
export function getAllNetworks(): Array<{ chainId: number; name: string }> {
  return Object.entries(SUPPORTED_CHAINS).map(([chainId, name]) => ({
    chainId: Number(chainId),
    name,
  }))
}