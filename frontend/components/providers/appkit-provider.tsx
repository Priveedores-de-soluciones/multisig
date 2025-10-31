"use client"

import React, { useEffect } from 'react'
import { createAppKit, useAppKitProvider, useAppKitAccount } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { BrowserProvider, type Eip1193Provider } from 'ethers'
import { web3Service } from '@/lib/web3'

import {
  base,
  baseSepolia,
  arbitrum,
  arbitrumSepolia,
  celo,
  celoAlfajores,
  lisk,
  liskSepolia
} from 'viem/chains'

// All supported chains
const supportedChains = [
  // Mainnets
  base,
  arbitrum,
  celo,
  lisk,
  
  // Testnets
  baseSepolia,
  arbitrumSepolia,
  celoAlfajores, // This is Celo's testnet
  liskSepolia
] as const

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID
if (!projectId) {
  throw new Error("NEXT_PUBLIC_REOWN_PROJECT_ID is not defined in .env.local")
}

const metadata = {
  name: 'MultiSig Wallet',
  description: 'A secure multi-signature wallet interface',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com',
  icons: ['https://your-domain.com/icon.png'],
}

createAppKit({
  adapters: [new EthersAdapter()],
  metadata,
  networks: supportedChains,
  defaultNetwork: baseSepolia, // You can change this to any supported chain
  projectId,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'github', 'apple', 'facebook', 'x', 'discord', 'farcaster'], // Set to true if you want social logins
  }
})

function Web3Sync() {
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155')

  useEffect(() => {
    async function syncProvider() {
      if (isConnected && walletProvider && address) {
        try {
          const ethersProvider = new BrowserProvider(walletProvider)
          const signer = await ethersProvider.getSigner()
          
          // Verify we're on the correct network
          const network = await ethersProvider.getNetwork()
          console.log("Connected to network:", network.chainId, network.name)
          
          // Set the signer in web3Service
          await web3Service.setSigner(signer)
          
          console.log("Web3Service synced with address:", address)
        } catch (error) {
          console.error("Failed to sync provider:", error)
          await web3Service.setSigner(null)
        }
      } else {
        await web3Service.setSigner(null)
        console.log("Web3Service signer cleared")
      }
    }
    
    syncProvider()
  }, [isConnected, walletProvider, address])

  return null
}

export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Web3Sync />
      {children}
    </>
  )
}