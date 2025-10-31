// hooks/use-web3.tsx
"use client"

import { useEffect } from "react"
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react"
import { useToast } from "@/hooks/use-toast"

export function useWeb3() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { caipNetwork } = useAppKitNetwork()
  const { toast } = useToast()

  // Monitor connection changes for toast notifications
  useEffect(() => {
    if (isConnected && address) {
      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        className: "bg-green-600 text-white border-green-700",
      })
    }
  }, [isConnected, address]) // Only show on initial connection

  // Connect function - just opens AppKit modal
  const connect = async () => {
    open()
  }

  // Disconnect function - opens account modal for disconnect
  const disconnect = async () => {
    open({ view: 'Account' })
  }

  return {
    isConnected: isConnected ?? false,
    walletAddress: address ?? "",
    isConnecting: false, // AppKit handles this internally
    connect,
    disconnect,
  }
}