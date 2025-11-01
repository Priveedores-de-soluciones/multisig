// hooks/useWeb3.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { web3Service } from "@/lib/web3"
import { useToast } from "@/hooks/use-toast"
import { isSupportedChain, getNetworkName, getTargetChainId } from "@/lib/networks" // Import network helpers

export function useWeb3() {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [networkName, setNetworkName] = useState("Unsupported Network")
  const [isSupported, setIsSupported] = useState(false)
  const { toast } = useToast()

  const checkNetwork = useCallback(async () => {
    if (!web3Service.isConnected()) {
      setIsSupported(false)
      setNetworkName("Not Connected")
      return
    }
    
    try {
      const netInfo = await web3Service.getNetworkInfo()
      if (netInfo) {
        const supported = isSupportedChain(netInfo.chainId)
        const name = getNetworkName(netInfo.chainId, netInfo.name)
        setIsSupported(supported)
        setNetworkName(name)
        
        if (!supported) {
           toast({
            title: "Wrong Network",
            description: `Please switch to the ${getNetworkName(getTargetChainId(), "target")} network.`,
            variant: "destructive",
          })
        }
      } else {
        setIsSupported(false)
        setNetworkName("Unknown Network")
      }
    } catch (error) {
      console.error("Could not get network info:", error)
      setIsSupported(false)
      setNetworkName("Network Error")
    }
  }, [toast])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    try {
      const address = await web3Service.connect()
      setWalletAddress(address)
      setIsConnected(true)
      await checkNetwork() // Check network after connecting

      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        className: "bg-green-600 text-white border-green-700",
      })
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }, [toast, checkNetwork])

  const disconnect = useCallback(async () => {
    await web3Service.disconnect()
    setIsConnected(false)
    setWalletAddress("")
    setIsSupported(false)
    setNetworkName("Not Connected")

    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
      className: "bg-gray-600 text-white border-gray-700",
    })
  }, [toast])

  const switchNetwork = useCallback(async () => {
    try {
      await web3Service.switchNetwork()
      // The chainChanged event will handle the reload
    } catch (error: any) {
      toast({
        title: "Network Switch Failed",
        description: error.message || "Could not switch network.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          // Use eth_accounts to check for existing connection without opening wallet
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            // If already connected, fully initialize the web3Service
            try {
              const address = await web3Service.connect() // This will setup signer and provider
              setWalletAddress(address)
              setIsConnected(true)
              await checkNetwork() // Check network on reconnect
            } catch (error) {
              console.error("Error reconnecting to wallet:", error)
              setIsConnected(false)
              setWalletAddress("")
            }
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error)
        }
      }
    }

    checkConnection()
  }, [checkNetwork]) // Add checkNetwork dependency

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          await disconnect()
        } else if (accounts[0] !== walletAddress) {
          // User switched accounts
          try {
            const address = await web3Service.connect() // Re-connect to get new signer
            setWalletAddress(address)
            setIsConnected(true)
            await checkNetwork() // Check network on account switch
          } catch (error) {
            console.error("Error handling account change:", error)
            await disconnect()
          }
        }
      }

      const handleChainChanged = () => {
        // Reload the page when chain changes to get new network info
        window.location.reload()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [walletAddress, disconnect, checkNetwork]) // Add checkNetwork dependency

  return {
    isConnected,
    walletAddress,
    isConnecting,
    networkName,
    isSupported,
    connect,
    disconnect,
    switchNetwork, // Expose the switch function
  }
}