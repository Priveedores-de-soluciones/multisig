"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Wallet, User, Shield, TrendingUp } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "@/hooks/use-web3"
import { ethers } from "ethers"
import { truncateAddress, formatBalance } from "@/lib/utils"
import { POPULAR_TOKENS } from "@/lib/constants"
import { useToast } from "@/hooks/use-toast"

export function Dashboard() {
  const { isConnected, walletAddress } = useWeb3()
  const { toast } = useToast()
  const [balances, setBalances] = useState({
    eth: "0.0",
    usdt: "0.0",
    usdc: "0.0",
  })
  const [contractInfo, setContractInfo] = useState({
    owner: "",
    controller: "",
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshBalances = async () => {
    if (!isConnected) return

    setIsRefreshing(true)
    try {
      // Get ETH balance
      const ethBalance = await web3Service.getBalance()

      // Get token balances for USDT and USDC
      const usdtToken = POPULAR_TOKENS.find((t) => t.symbol === "USDT")
      const usdcToken = POPULAR_TOKENS.find((t) => t.symbol === "USDC")

      let usdtBalance = "0.0"
      let usdcBalance = "0.0"

      if (usdtToken) {
        usdtBalance = await web3Service.getTokenBalance(usdtToken.address)
      }

      if (usdcToken) {
        usdcBalance = await web3Service.getTokenBalance(usdcToken.address)
      }

      setBalances({
        eth: ethBalance,
        usdt: usdtBalance,
        usdc: usdcBalance,
      })

      // Get contract info
      const owner = await web3Service.getOwner()
      const controller = await web3Service.getController()

      setContractInfo({
        owner,
        controller,
      })

      toast({
        title: "Balances Updated",
        description: "Latest wallet balances have been fetched",
        className: "bg-green-600 text-white border-green-700",
      })
    } catch (error: any) {
      console.error("Error refreshing balances:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update balances",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchRecentTransactions = async () => {
    if (!isConnected) return

    try {
      // Get recent transactions from events
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(
        web3Service.getCompanyWalletContract().target as string,
        web3Service.getCompanyWalletContract().interface,
        provider,
      )

      // Get the last 5 TransactionExecuted events
      const filter = contract.filters.TransactionExecuted()
      const events = await contract.queryFilter(filter, -10000, "latest")

      const transactions = await Promise.all(
        events.slice(-5).map(async (event: any) => {
          const block = await provider.getBlock(event.blockNumber)
          const timestamp = block ? new Date(Number(block.timestamp) * 1000).toLocaleString() : "Unknown"

          return {
            id: event.transactionHash,
            type: "TransactionExecuted",
            to: event.args[0],
            value: ethers.formatEther(event.args[1]),
            token: event.args[2],
            status: event.args[3] ? "Success" : "Failed",
            timestamp,
          }
        }),
      )

      setRecentTransactions(transactions.reverse())
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  useEffect(() => {
    if (isConnected) {
      refreshBalances()
      fetchRecentTransactions()
    }
  }, [isConnected])

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">ETH Balance</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatBalance(balances.eth)} ETH</div>
            <p className="text-xs text-gray-500 mt-1">≈ ${(Number.parseFloat(balances.eth) * 2400).toFixed(2)} USD</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">USDT Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatBalance(balances.usdt)} USDT</div>
            <p className="text-xs text-gray-500 mt-1">Tether USD</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">USDC Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatBalance(balances.usdc)} USDC</div>
            <p className="text-xs text-gray-500 mt-1">USD Coin</p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Info and Refresh */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Contract Information</CardTitle>
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
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-300">Owner</span>
              </div>
              <span className="text-sm text-white font-mono">
                {contractInfo.owner ? truncateAddress(contractInfo.owner) : "Loading..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="text-gray-300">Controller</span>
              </div>
              <span className="text-sm text-white font-mono">
                {contractInfo.controller ? truncateAddress(contractInfo.controller) : "Loading..."}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Transactions</CardTitle>
            <CardDescription className="text-gray-400">Latest wallet activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {tx.type === "TransactionExecuted" ? "Send" : tx.type}
                        </span>
                        <span className="text-xs text-gray-400">{tx.timestamp}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-white">{tx.value} ETH</span>
                      <Badge
                        variant={tx.status === "Success" ? "default" : "secondary"}
                        className={tx.status === "Success" ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400">No recent transactions</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
