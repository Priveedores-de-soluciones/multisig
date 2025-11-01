"use client"

import { useState, useEffect, useMemo } from "react" // <--- Added useMemo
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Wallet, User, Shield, TrendingUp, Users } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "../hooks/use-web3"
import { ethers } from "ethers"
import { truncateAddress, formatBalance } from "@/lib/utils"
import { Token, CHAIN_POPULAR_TOKENS } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"

export function Dashboard() {
  const { isConnected, walletAddress } = useWeb3()
  const { toast } = useToast()
  
  const [nativeToken, setNativeToken] = useState<Token | undefined>(undefined)
  const [balances, setBalances] = useState<{ [symbol: string]: string }>({})
  
  // 💰 State for storing USD prices (Symbol -> Price in USD)
  const [pricesUsd, setPricesUsd] = useState<{ [symbol: string]: number }>({}); 

  const [contractInfo, setContractInfo] = useState({
    owner: "",
    controller: "",
    owners: [] as Array<{ address: string; name: string; percentage: string }>,
    requiredPercentage: 0,
  })
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // 💰 NEW: Total Portfolio USD Value Calculation
  const totalUsdValue = useMemo(() => {
    let total = 0
    for (const symbol in balances) {
      const balance = parseFloat(balances[symbol] || "0")
      const price = pricesUsd[symbol] || 0
      total += balance * price
    }
    return total
  }, [balances, pricesUsd])
  
  // 💰 NEW: USD Formatting Helper
  const formatUsd = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value);
  }

  const refreshBalances = async () => {
    if (!isConnected || !web3Service.isConnected()) { 
      console.log("Skipping refresh - wallet not ready")
      return
    }

    setIsRefreshing(true)
    try {
      const networkInfo = await web3Service.getNetworkInfo()
      if (!networkInfo) throw new Error("Could not determine current network.");
      
      const allPopularTokens = await web3Service.getPopularTokens()
      const native = allPopularTokens.find(t => t.address === ethers.ZeroAddress)
      if (!native) throw new Error("Could not load native token info for current chain.");
      
      setNativeToken(native)
      
      const newBalances: { [symbol: string]: string } = {}
      const tokensToFetchPrice: Token[] = [native]; // Start with the native token

      // 1. Get Native Token Balance
      const nativeBalance = await web3Service.getBalance()
      newBalances[native.symbol] = nativeBalance
      
      // 2. Get other Popular Token Balances
      for (const token of allPopularTokens) {
        if (token.address !== ethers.ZeroAddress) {
          try {
            const tokenBalance = await web3Service.getTokenBalance(token.address, token.decimals)
            newBalances[token.symbol] = tokenBalance
            tokensToFetchPrice.push(token); // Add token to price list
          } catch (e) {
            newBalances[token.symbol] = "0.0"
          }
        }
      }
      setBalances(newBalances)
      
      // 3. NEW: Fetch USD Prices
      const tokenSymbolsToFetch = tokensToFetchPrice.map(t => t.symbol);
      const usdPrices = await web3Service.getPricesUsdBySymbol(tokenSymbolsToFetch); 
      setPricesUsd(usdPrices);

      // 4. Get Contract Info
      const [owner, controller, ownersData, requiredPercentage] = await Promise.all([
        web3Service.getOwner(),
        web3Service.getController(),
        web3Service.getOwners(),
        web3Service.getRequiredPercentage(),
      ])

      const formattedOwners = ownersData.addresses.map((addr: string, index: number) => ({
        address: addr,
        name: ownersData.names[index],
        percentage: ownersData.percentages[index].toString(),
      }))

      setContractInfo({
        owner,
        controller,
        owners: formattedOwners,
        requiredPercentage,
      })

      // 5. Get Pending Transactions (Logic remains unchanged, but uses updated allPopularTokens)
      const txCount = await web3Service.getTransactionCount()
      const pending = []
      
      const startIndex = Math.max(0, txCount - 10)
      for (let i = startIndex; i < txCount; i++) {
        const tx = await web3Service.getTransaction(i)
        if (!tx.executed) {
          pending.push({
            id: i,
            to: tx.to,
            // Format value based on token type
            value: tx.isTokenTransfer 
                   ? ethers.formatUnits(tx.value, allPopularTokens.find(t => t.address.toLowerCase() === tx.tokenAddress.toLowerCase())?.decimals || 18)
                   : ethers.formatEther(tx.value),
            confirmations: Number(tx.confirmationCount),
            isTokenTransfer: tx.isTokenTransfer,
            tokenSymbol: tx.isTokenTransfer 
                         ? allPopularTokens.find(t => t.address.toLowerCase() === tx.tokenAddress.toLowerCase())?.symbol || "Tokens" 
                         : native.symbol,
          })
        }
      }
      
      setPendingTransactions(pending)

      toast({
        title: "Dashboard Updated",
        description: `Latest wallet information for ${native.name} has been fetched`,
        className: "bg-green-600 text-white border-green-700",
      })
    } catch (error: any) {
      console.error("Error refreshing dashboard:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update dashboard",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (isConnected) {
      // Small timeout to ensure web3Service has updated its provider/signer after connection
      const timer = setTimeout(() => {
        if (web3Service.isConnected()) { 
          refreshBalances()
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isConnected])

  // Helper for rendering balance cards (UPDATED for USD)
  const renderBalanceCard = (token: Token, balance: string) => {
    // 1. Get the USD price from state
    const priceUsd = pricesUsd[token.symbol] || 0;
    
    // 2. Calculate the total USD value for this token
    let usdValue = 0;
    try {
      usdValue = parseFloat(balance) * priceUsd;
    } catch (e) {
      usdValue = 0;
    }
    
    // 3. Format the USD value
    const formattedUsdValue = formatUsd(usdValue);
      
    return (
      <Card className="bg-gray-900 border-gray-800" key={token.symbol}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">{token.symbol} Balance</CardTitle>
          <Wallet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-white break-all">
            {formatBalance(balance)} {token.symbol}
          </div>
          {/* Display USD Value */}
          <p className="text-sm font-semibold text-green-400 mt-1">
            {formattedUsdValue} USD
          </p>
          <p className="text-xs text-gray-500 mt-1">{token.name} ({nativeToken?.name} Network)</p>
        </CardContent>
      </Card>
    )
  }
  
  // Get the popular tokens to display on the dashboard (e.g., native + one stablecoin/popular token)
  const tokensToDisplay: Token[] = useMemo(() => {
      const tokens: Token[] = []
      if (nativeToken) {
          tokens.push(nativeToken)
          
          // Try to get tokens for the current chain
          const currentChainId = web3Service.getNetworkInfo()?.chainId || 0
          const popularTokens = CHAIN_POPULAR_TOKENS[currentChainId] || []
          
          // Find a stablecoin or popular token
          const secondToken = popularTokens.find(t => 
              t.address !== ethers.ZeroAddress && 
              t.symbol.toUpperCase() !== nativeToken.symbol.toUpperCase()
          )
          
          if (secondToken) {
              tokens.push(secondToken)
          }
      }
      return tokens
  }, [nativeToken]) // Depend on nativeToken
  
  if (!isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-800 w-full max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-gray-400">Please connect your wallet...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      
      {/* 💰 NEW: Total Portfolio Value Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-gray-300 text-base">Total Portfolio Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl sm:text-4xl font-extrabold text-green-400">
            {formatUsd(totalUsdValue)}
          </div>
        </CardContent>
      </Card>
      
      {/* Balance Cards (Dynamic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {tokensToDisplay.slice(0, 2).map(token => {
          const balance = balances[token.symbol] || "0.0"
          return renderBalanceCard(token, balance)
        })}
      </div>

      {/* Contract Info and Multisig Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg sm:text-xl">Contract Information</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshBalances}
                disabled={isRefreshing}
                className="border-gray-600 hover:bg-gray-800 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Owner</span>
              </div>
              <span className="text-xs sm:text-sm text-white font-mono break-all sm:text-right">
                {contractInfo.owner ? truncateAddress(contractInfo.owner) : "Loading..."}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-gray-300 text-sm">Controller</span>
              </div>
              <span className="text-xs sm:text-sm text-white font-mono break-all sm:text-right">
                {contractInfo.controller ? truncateAddress(contractInfo.controller) : "Loading..."}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">Required Approval</span>
                </div>
                <span className="text-sm text-white">{contractInfo.requiredPercentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg sm:text-xl">Multisig Owners</CardTitle>
            <CardDescription className="text-gray-400 text-xs sm:text-sm">Current wallet signers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3 max-h-48 overflow-y-auto">
              {contractInfo.owners.length > 0 ? (
                contractInfo.owners.map((owner, index) => (
                  <div key={owner.address} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm text-white font-medium truncate">
                          {owner.name}
                        </span>
                        <span className="text-xs text-gray-400 font-mono truncate">
                          {truncateAddress(owner.address)}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-gray-700 text-white text-xs ml-2 flex-shrink-0">
                      {owner.percentage}%
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">Loading owners...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transactions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg sm:text-xl">Pending Transactions</CardTitle>
          <CardDescription className="text-gray-400 text-xs sm:text-sm">Transactions awaiting multisig approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingTransactions.length > 0 ? (
              pendingTransactions.map((tx) => (
                <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-800 rounded-lg space-y-2 sm:space-y-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      Transaction #{tx.id}
                    </span>
                    <span className="text-xs text-gray-400 break-all">
                      {tx.isTokenTransfer ? `${tx.tokenSymbol} Transfer` : `${nativeToken?.symbol || 'Native'} Transfer`} to {truncateAddress(tx.to)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <span className="text-xs sm:text-sm text-white">{tx.value} {tx.tokenSymbol}</span>
                    <Badge variant="outline" className="border-yellow-600 text-yellow-400 text-xs">
                      {tx.confirmations} confirmations
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No pending transactions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}