// lib/networks.ts
import { defineChain } from 'viem'
import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  arbitrum,
  arbitrumSepolia,
  celo,
  celoSepolia,
  lisk,
  liskSepolia
} from 'viem/chains'


// --- Export All Chains ---
// We also include mainnet and sepolia for good measure.
export const supportedChains = [
  // Standard
  mainnet,
  base,
  arbitrum,
  celo,
  lisk,

  // Testnets
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  celoSepolia,
  liskSepolia
]

// You would then pass `supportedChains` to your AppKitProvider:
//
// createAppKit({
//   ...
//   networks: supportedChains,
//   defaultNetwork: baseSepolia, // or whichever you prefer
//   ...
// })