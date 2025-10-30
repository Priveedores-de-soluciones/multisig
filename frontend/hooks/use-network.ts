// hooks/use-network.ts
"use client"

import { useConfig, useAccount } from "wagmi"
import { type Chain } from "viem"

// Define a simple Network type for the component
export interface Network {
  chainId: number
  name: string
  isTestnet: boolean
}

export function useNetwork() {
  const { chains } = useConfig() // Get chains from wagmi config
  const { chain } = useAccount() // Get current active chain

  const networks: Network[] = chains.map((c: Chain) => ({
    chainId: c.id,
    name: c.name,
    isTestnet: c.testnet || false,
  }))

  const currentNetwork = networks.find(n => n.chainId === chain?.id)

  return {
    networks,
    currentNetwork: currentNetwork || null,
  }
}