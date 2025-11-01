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
import { useWeb3 } from "../hooks/use-web3" // UPDATED PATH
import { Token } from "@/lib/constants" // Import Token interface
import { truncateAddress } from "@/lib/utils"
import { ethers } from "ethers" // Import ethers for ZeroAddress

interface TokenBalance extends Token { // Use the Token interface and extend it
  balance: string
}

export function TokenManagement() {
  const { isConnected } = useWeb3()
  const { toast } = useToast()
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [customTokenAddress, setCustomTokenAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [companyWalletAddress, setCompanyWalletAddress] = useState("") // New state for wallet address
  const [explorerBaseUrl, setExplorerBaseUrl] = useState("") // New state for explorer base URL

  const fetchTokenBalances = async () => {
    if (!isConnected) return

    setIsLoading(true)
    try {
      const allTokens = await web3Service.getPopularTokens() // Get tokens for current chain
      const walletAddress = await web3Service.getCompanyWalletAddress()
      const networkInfo = await web3Service.getNetworkInfo()
      
      // Determine explorer base URL (for ExternalLink button)
      let explorerUrl = "https://etherscan.io";
      if (networkInfo?.chainId === 84532) explorerUrl = "https://sepolia.basescan.org";
      else if (networkInfo?.chainId === 421614) explorerUrl = "https://sepolia.arbiscan.io";
      else if (networkInfo?.chainId === 11142220) explorerUrl = "https://celo-sepolia.celoscan.io";
      setExplorerBaseUrl(explorerUrl);
      
      setCompanyWalletAddress(walletAddress)

      const balances: TokenBalance[] = []
      
      for (const token of allTokens) {
        // 1. Get Native Token Balance
        if (token.address === ethers.ZeroAddress) {
          const nativeBalance = await web3Service.getBalance()
          balances.push({
            ...token,
            balance: nativeBalance,
          })
        } 
        // 2. Get ERC20 Token Balance
        else {
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
      // For a custom token, we assume 18 decimals initially, but a robust app should fetch this from the contract
      const ASSUMED_DECIMALS = 18 
      const balance = await web3Service.getTokenBalance(customTokenAddress, ASSUMED_DECIMALS)
      
      const exists = tokenBalances.find(
        t => t.address.toLowerCase() === customTokenAddress.toLowerCase()
      )

      if (!exists) {
        setTokenBalances([...tokenBalances, {
          address: customTokenAddress,
          symbol: "CUSTOM",
          name: "Custom Token",
          balance,
          decimals: ASSUMED_DECIMALS,
        }])

        toast({
          title: "Token Added",
          description: `Custom token ${truncateAddress(customTokenAddress)} has been added (assumed 18 decimals)`,
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
    if (address === ethers.ZeroAddress || !explorerBaseUrl) return
    window.open(`${explorerBaseUrl}/address/${address}`, "_blank")
  }

  const copyWalletAddress = () => {
    if (!companyWalletAddress) return;
    navigator.clipboard.writeText(companyWalletAddress)
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
      <Card className="bg-gray-900 border-gray-800 w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-gray-400">Please connect your wallet to manage tokens</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Wallet Address Info (Dynamic) */}
      <Card className="bg-blue-900/20 border-blue-800 w-full">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="w-full sm:w-auto">
              <p className="text-xs sm:text-sm text-blue-300 mb-1">Company Wallet Address</p>
              <p className="text-white font-mono text-xs sm:text-base break-all">
                {companyWalletAddress || "Loading..."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyWalletAddress}
              disabled={!companyWalletAddress}
              className="border-blue-600 hover:bg-blue-800 text-blue-300 w-full sm:w-auto"
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

      {/* Token Balances (Dynamic) */}
      <Card className="bg-gray-900 border-gray-800 w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div>
              <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <span>Token Balances</span>
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                View and manage wallet token balances
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTokenBalances}
              disabled={isLoading}
              className="border-gray-600 hover:bg-gray-800 bg-transparent w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tokenBalances.length > 0 ? (
              tokenBalances.map((token) => (
                <div key={token.address} className="p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs sm:text-sm">
                          {token.symbol.substring(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-white font-medium text-sm sm:text-base">{token.name}</span>
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                            {token.symbol}
                          </Badge>
                        </div>
                        {token.address !== ethers.ZeroAddress && (
                          <div className="flex items-center space-x-1 sm:space-x-2 mt-1">
                            <span className="text-xs text-gray-400 font-mono truncate max-w-[150px] sm:max-w-none">
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
                            {explorerBaseUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-gray-400 hover:text-gray-300"
                                onClick={() => openExplorer(token.address)}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <p className="text-lg sm:text-xl font-bold text-white break-all">{token.balance}</p>
                      <p className="text-xs text-gray-400">{token.symbol}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Coins className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No tokens found</p>
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
      <Card className="bg-gray-900 border-gray-800 w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <span>Track Custom Token</span>
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs sm:text-sm">
            Add a custom ERC-20 token to track its balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Input
              placeholder="Enter token contract address (0x...)"
              value={customTokenAddress}
              onChange={(e) => setCustomTokenAddress(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm flex-1"
            />
            <Button
              onClick={addCustomToken}
              disabled={!customTokenAddress || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
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