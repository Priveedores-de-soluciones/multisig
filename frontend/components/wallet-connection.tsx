"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, LogOut } from "lucide-react"
import { useAppKit, useAppKitAccount } from "@reown/appkit/react" // Import AppKit hooks
import { truncateAddress } from "@/lib/utils"

export function WalletConnection() {
  const { open, isConnecting } = useAppKit() // Get open modal function and loading state
  // FIX: Removed the stray underscore after '}'
  const { address, isConnected } = useAppKitAccount() // Get connection state

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-3">
        <Badge variant="outline" className="bg-green-600/20 text-green-400 border-green-600">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          Connected
        </Badge>
        <span className="text-sm text-gray-300 hidden md:inline">{truncateAddress(address)}</span>
        <Button
          variant="outline"
          size="sm"
          // Open the account modal to show disconnect/switch wallet options
          onClick={() => open({ view: 'Account' })}
          className="border-gray-600 hover:bg-gray-800 bg-transparent"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={() => open()} disabled={isConnecting} className="bg-blue-600 hover:bg-blue-700 text-white">
      {isConnecting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </>
      )}
    </Button>
  )
}

