"use client"

import React, { useEffect } from 'react'
import { createAppKit, useAppKitProvider, useAppKitAccount } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
// Import BrowserProvider AND the Eip1193Provider type
import { BrowserProvider, type Eip1193Provider } from 'ethers'
import { web3Service } from '@/lib/web3'

// 1. Import all the chains you want to support
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

// 2. Create a list of those chains
const supportedChains = [
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
] as const // <-- FIX: Added 'as const' to ensure non-empty array type

// 3. Get Project ID
//    Add this to your .env.local file: NEXT_PUBLIC_REOWN_PROJECT_ID=...
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
if (!projectId) {
  throw new Error("NEXT_PUBLIC_REOWN_PROJECT_ID is not defined in .env.local")
}

// 4. Create metadata
const metadata = {
  name: 'MultiSig Wallet',
  description: 'A secure multi-signature wallet interface',
  url: 'https://your-domain.com', // TODO: Update this
  icons: ['https://your-domain.com/icon.png'], // TODO: Update this
}

// 5. Create AppKit instance and pass all your chains
createAppKit({
  adapters: [new EthersAdapter()],
  metadata,
  networks: supportedChains,     // <-- This now works with 'as const'
  defaultNetwork: baseSepolia, // <-- This should now correctly infer from networks
  projectId,
})

/**
 * This component syncs the AppKit provider state with your singleton web3Service.
 * This is the bridge that makes the rest of your app work without a full rewrite.
 */
function Web3Sync() {
  const { address, isConnected } = useAppKitAccount()
  // Add the generic type <Eip1193Provider>
  const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155') // EIP155 for EVM chains

  useEffect(() => {
    async function syncProvider() {
      if (isConnected && walletProvider) {
        try {
          // This line will now work correctly
          const ethersProvider = new BrowserProvider(walletProvider)
          const signer = await ethersProvider.getSigner()
          web3Service.setSigner(signer) // Pass signer to your service
        } catch (error) {
          console.error("Failed to sync provider:", error)
          web3Service.setSigner(null)
        }
      } else {
        web3Service.setSigner(null) // Clear signer on disconnect
      }
    }
    syncProvider()
  }, [isConnected, walletProvider, address])

  return null // This component doesn't render anything
}

// 6. Create the provider wrapper
export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Web3Sync />
      {children}
    </>
  )
}

