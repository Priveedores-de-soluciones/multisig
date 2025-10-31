// components/NetworkSelector.tsx
"use client"

import { useAppKit } from "@reown/appkit/react"
import { Button } from "@/components/ui/button"
import { Network } from "lucide-react"
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react"
import { isSupportedChain, getNetworkName } from "@/lib/networks"

export function NetworkSelector() {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()
  const { caipNetwork, caipNetworkId } = useAppKitNetwork()

  // Don't show if not connected
  if (!isConnected) {
    return null
  }

  // Check if we're on a supported network
  const isCorrectNetwork = isSupportedChain(caipNetworkId)
  
  // Get the display name
  const networkName = getNetworkName(caipNetworkId, caipNetwork?.name ?? "Unsupported Network")

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => open({ view: "Networks" })}
      className={`border-gray-600 hover:bg-gray-800 bg-transparent space-x-2 ${
        !isCorrectNetwork ? 'border-red-600 text-red-400' : 'border-green-600/50 text-green-400'
      }`}
    >
      <Network className="h-4 w-4" />
      <span className="hidden sm:inline">{networkName}</span>
    </Button>
  )
}