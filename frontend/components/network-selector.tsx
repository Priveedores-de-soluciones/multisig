"use client"

import { useAppKit } from "@reown/appkit/react"
import { Button } from "@/components/ui/button"
import { Network } from "lucide-react"
// Get chainId from useAppKitAccount
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react"

export function NetworkSelector() {
  // Use isConnecting from useAppKit to handle loading state
  const { open, isConnecting } = useAppKit()
  
  // 1. Get connection status from useAppKitAccount
  const { isConnected } = useAppKitAccount()
  
  // 2. Get the network object from useAppKitNetwork
  const { network } = useAppKitNetwork()

  // 3. The chainId is the 'id' property on the network object
  //    This will be 'undefined' if the network is not supported
  const chainId = network?.id
  
  // --- DEBUGGING LOGS ---
  // Open your browser console to see these logs
  // console.log("AppKit's resolved network object:", network) 
  // console.log("Wallet's current chainId (from network object):", chainId)
  // --- END DEBUGGING ---

  // Don't show if not connected OR if AppKit is in the process of connecting
  if (!isConnected || isConnecting) {
    return null
  }

  // Determine the display name
  let networkName: string
  if (isConnecting) {
    networkName = "Connecting..."
  } else if (network?.name) {
    networkName = network.name
  } else {
    networkName = "Wrong Network"
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => open({ view: "Networks" })}
      className="border-gray-600 hover:bg-gray-800 bg-transparent space-x-2"
      disabled={isConnecting} // Disable button while connecting
    >
      <Network className="h-4 w-4" />
      <span className="hidden sm:inline">{networkName}</span>
    </Button>
  )
}

