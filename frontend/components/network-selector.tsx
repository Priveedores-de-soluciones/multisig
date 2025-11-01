"use client"

import { useWeb3 } from "@/hooks/use-web3"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Network, Check, AlertCircle, Loader2 } from "lucide-react"
import { SUPPORTED_CHAINS } from "@/lib/networks"

export function NetworkSelector() {
  const { 
    isConnected, 
    networkName, 
    isSupported, 
    chainId, 
    switchNetwork, 
    isSwitching 
  } = useWeb3()

  if (!isConnected) {
    return null
  }

  // Get list of supported networks
  const supportedNetworks = Object.entries(SUPPORTED_CHAINS).map(([id, name]) => ({
    chainId: Number(id),
    name,
  }))

  const handleSwitchNetwork = (targetChainId: number) => {
    switchNetwork(targetChainId)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSwitching}
          className={`border-gray-600 hover:bg-gray-800 bg-transparent space-x-2 ${
            !isSupported
              ? "border-red-600 text-red-400"
              : "border-green-600/50 text-green-400"
          }`}
        >
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Network className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{networkName}</span>
          {!isSupported && !isSwitching && <AlertCircle className="h-3 w-3" />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-gray-400">
          Select Network
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {supportedNetworks.map((network) => {
          const isActive = chainId === network.chainId
          return (
            <DropdownMenuItem
              key={network.chainId}
              onClick={() => handleSwitchNetwork(network.chainId)}
              disabled={isSwitching}
              className="cursor-pointer flex items-center justify-between"
            >
              <span
                className={
                  isActive
                    ? "font-semibold text-green-400"
                    : "text-gray-300"
                }
              >
                {network.name}
              </span>
              {isActive && <Check className="h-4 w-4 text-green-400" />}
            </DropdownMenuItem>
          )
        })}

        {!isSupported && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-red-400">
              ⚠️ Current network is not supported
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}