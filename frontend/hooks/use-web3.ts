"use client"

import { useState, useEffect, useCallback } from "react"
import { web3Service } from "@/lib/web3"
import { useToast } from "@/hooks/use-toast"

export function useWeb3() {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const connect = useCallback(async () => {
    setIsConnecting(true)
    try {
      const address = await web3Service.connect()
      setWalletAddress(address)
      setIsConnected(true)

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
  }, [toast])

  const disconnect = useCallback(async () => {
    await web3Service.disconnect()
    setIsConnected(false)
    setWalletAddress("")

    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
      className: "bg-gray-600 text-white border-gray-700",
    })
  }, [toast])

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== "undefined") {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            // IMPORTANT: Initialize the web3Service with the existing connection
            try {
              const address = await web3Service.connect()
              setWalletAddress(address)
              setIsConnected(true)
            } catch (error) {
              console.error("Error reconnecting to wallet:", error)
              // If connection fails, the wallet might be locked or disconnected
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
  }, [])

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
            const address = await web3Service.connect()
            setWalletAddress(address)
            setIsConnected(true)
          } catch (error) {
            console.error("Error handling account change:", error)
            await disconnect()
          }
        }
      }

      const handleChainChanged = () => {
        // Reload the page when chain changes
        window.location.reload()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [walletAddress, disconnect])

  return {
    isConnected,
    walletAddress,
    isConnecting,
    connect,
    disconnect,
  }
}