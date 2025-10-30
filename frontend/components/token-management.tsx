"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Coins, RefreshCw, Plus, Copy, ExternalLink } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "@/hooks/use-web3"
import { POPULAR_TOKENS, CONTRACT_ADDRESSES } from "@/lib/constants"
import { truncateAddress } from "@/lib/utils"

interface TokenBalance {
  address: string
  symbol: string
  name: string
  balance: string
  decimals: number
}

export function TokenManagement() {
  const { isConnected } = useWeb3()
  const { toast } = useToast()
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [customTokenAddress, setCustomTokenAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const fetchTokenBalances = async () => {
    if (!isConnected) return

    setIsLoading(true)
    try {
      const balances: TokenBalance[] = []

      // Get ETH balance
      const ethBalance = await web3Service.getBalance()
      balances.push({
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        name: "Ether",
        balance: ethBalance,
        decimals: 18,
      })

      // Get balances for popular tokens
      for (const token of POPULAR_TOKENS) {
        if (token.address !== "0x0000000000000000000000000000000000000000") {
          try {
            const balance = await web3Service.getTokenBalance(token.address, token.decimals)
            balances.push({
              ...token,
              balance,
            })
          } catch (error) {
            console.error(`Error fetching ${token.symbol} balance:`, error)
            balances.push({
              ...token,
              balance: "0.0",
            })
          }
        }
      }

      setTokenBalances(balances)

      toast({
        title: "Balances Updated",
        description: "Token balances have been refreshed",
        className: "bg-green-600 text-white border-green-700",
      })
    } catch (error: any) {
      console.error("Error fetching balances:", error)
      toast({
        title: "Failed to Update Balances",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addCustomToken = async () => {
    if (!customTokenAddress) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid token address",
        variant: "destructive",
      })
      return
    }

    try {
      // Try to get the balance of the custom token
      const balance = await web3Service.getTokenBalance(customTokenAddress, 18)
      
      // Add to the list if not already present
      const exists = tokenBalances.find(
        t => t.address.toLowerCase() === customTokenAddress.toLowerCase()
      )

      if (!exists) {
        setTokenBalances([...tokenBalances, {
          address: customTokenAddress,
          symbol: "CUSTOM",
          name: "Custom Token",
          balance,
          decimals: 18,
        }])

        toast({
          title: "Token Added",
          description: `Custom token ${truncateAddress(customTokenAddress)} has been added`,
          className: "bg-green-600 text-white border-green-700",
        })
      } else {
        toast({
          title: "Token Already Added",
          description: "This token is already in your list",
          variant: "destructive",
        })
      }

      setCustomTokenAddress("")
    } catch (error: any) {
      console.error("Error adding custom token:", error)
      toast({
        title: "Failed to Add Token",
        description: "Please ensure this is a valid ERC-20 token",
        variant: "destructive",
      })
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast({
      title: "Address Copied",
      description: "Token address has been copied to clipboard",
      className: "bg-blue-600 text-white border-blue-700",
    })
  }

  const openExplorer = (address: string) => {
    if (address === "0x0000000000000000000000000000000000000000") return
    // Base Sepolia explorer
    window.open(`https://sepolia.basescan.org/address/${address}`, "_blank")
  }

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESSES.COMPANY_WALLET)
    toast({
      title: "Wallet Address Copied",
      description: "Company wallet address has been copied to clipboard",
      className: "bg-blue-600 text-white border-blue-700",
    })
  }

  useEffect(() => {
    if (isConnected) {
      fetchTokenBalances()
    }
  }, [isConnected])

  if (!isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-gray-400">Please connect your wallet to manage tokens</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wallet Address Info */}
      <Card className="bg-blue-900/20 border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-300 mb-1">Company Wallet Address</p>
              <p className="text-white font-mono">{CONTRACT_ADDRESSES.COMPANY_WALLET}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyWalletAddress}
              className="border-blue-600 hover:bg-blue-800 text-blue-300"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-blue-200 mt-3">
            Send tokens to this address to add them to the company wallet
          </p>
        </CardContent>
      </Card>

      {/* Token Balances */}
      <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center space-x-2">
                <Coins className="h-5 w-5 text-green-500" />
                <span>Token Balances</span>
              </CardTitle>
              <CardDescription className="text-gray-400">
                View and manage wallet token balances
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTokenBalances}
              disabled={isLoading}
              className="border-gray-600 hover:bg-gray-800 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tokenBalances.length > 0 ? (
              tokenBalances.map((token) => (
                <div key={token.address} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {token.symbol.substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">{token.name}</span>
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                            {token.symbol}
                          </Badge>
                        </div>
                        {token.address !== "0x0000000000000000000000000000000000000000" && (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400 font-mono">
                              {truncateAddress(token.address)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-gray-400 hover:text-gray-300"
                              onClick={() => copyAddress(token.address)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-gray-400 hover:text-gray-300"
                              onClick={() => openExplorer(token.address)}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{token.balance}</p>
                      <p className="text-xs text-gray-400">{token.symbol}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Coins className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No tokens found</p>
                <Button
                  variant="outline"
                  className="mt-4 border-gray-600 hover:bg-gray-800 text-gray-300"
                  onClick={fetchTokenBalances}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Balances
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Custom Token */}
      <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Plus className="h-5 w-5 text-blue-500" />
            <span>Track Custom Token</span>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Add a custom ERC-20 token to track its balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter token contract address (0x...)"
              value={customTokenAddress}
              onChange={(e) => setCustomTokenAddress(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
            <Button
              onClick={addCustomToken}
              disabled={!customTokenAddress}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Token
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}