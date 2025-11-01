"use client"

import { useWeb3 } from "@/hooks/use-web3" // Import our manual hook - UPDATED PATH
import { Button } from "@/components/ui/button"
import { Network } from "lucide-react"

export function NetworkSelector() {
  // Get all network info and functions from our hook
  const { isConnected, networkName, isSupported, switchNetwork } = useWeb3()

  // Don't show if not connected
  if (!isConnected) {
    return null
  }
  
  const handleNetworkClick = () => {
    if (!isSupported) {
      // If not on the correct network, clicking tries to switch
      switchNetwork()
    }
    // If already on the correct network, you could still call switchNetwork()
    // to open the wallet's network modal, or just do nothing.
    // Calling it anyway provides a consistent "open network menu" feel.
    // switchNetwork() 
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleNetworkClick} // Click tries to switch if unsupported
      className={`border-gray-600 hover:bg-gray-800 bg-transparent space-x-2 ${
        !isSupported ? 'border-red-600 text-red-400' : 'border-green-600/50 text-green-400'
      }`}
    >
      <Network className="h-4 w-4" />
      <span className="hidden sm:inline">{networkName}</span>
    </Button>
  )
}
