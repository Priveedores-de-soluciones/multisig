"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, LogOut } from "lucide-react"
import { useWeb3 } from "@/hooks/use-web3"
import { truncateAddress } from "@/lib/utils"

export function WalletConnection() {
  const { isConnected, walletAddress, isConnecting, connect, disconnect } = useWeb3()

  if (isConnected) {
    return (
      <div className="flex items-center space-x-3">
        <Badge variant="outline" className="bg-green-600/20 text-green-400 border-green-600">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
          Connected
        </Badge>
        <span className="text-sm text-gray-300">{truncateAddress(walletAddress)}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="border-gray-600 hover:bg-gray-800 bg-transparent"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={connect} disabled={isConnecting} className="bg-blue-600 hover:bg-blue-700 text-white">
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
