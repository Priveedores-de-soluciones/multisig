"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Wallet, User, Shield, TrendingUp, Users } from "lucide-react"
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
    usdc: "0.0",
  })
  const [contractInfo, setContractInfo] = useState({
    owner: "",
    controller: "",
    // --- UPDATED: Added 'name' to the owners array type ---
    owners: [] as Array<{ address: string; name: string; percentage: string }>,
    requiredPercentage: 0,
  })
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshBalances = async () => {
    if (!isConnected) return

    setIsRefreshing(true)
    try {
      // Get ETH balance
      const ethBalance = await web3Service.getBalance()

      // Get USDC balance (6 decimals on Base Sepolia)
      const usdcToken = POPULAR_TOKENS.find((t) => t.symbol === "USDC")
      let usdcBalance = "0.0"

      if (usdcToken) {
        usdcBalance = await web3Service.getTokenBalance(usdcToken.address, usdcToken.decimals)
      }

      setBalances({
        eth: ethBalance,
        usdc: usdcBalance,
      })

      // Get contract info
      const [owner, controller, ownersData, requiredPercentage] = await Promise.all([
        web3Service.getOwner(),
        web3Service.getController(),
        web3Service.getOwners(),
        web3Service.getRequiredPercentage(),
      ])

      // --- UPDATED: Map the 'names' array from ownersData ---
      const formattedOwners = ownersData.addresses.map((addr: string, index: number) => ({
        address: addr,
        name: ownersData.names[index], // <-- Added this
        percentage: ownersData.percentages[index].toString(),
      }))
      // --- END UPDATE ---

      setContractInfo({
        owner,
        controller,
        owners: formattedOwners,
        requiredPercentage,
      })

      // Get pending transactions
      const txCount = await web3Service.getTransactionCount()
      const pending = []
      
      // Check last 10 transactions for pending ones
      const startIndex = Math.max(0, txCount - 10)
      for (let i = startIndex; i < txCount; i++) {
        const tx = await web3Service.getTransaction(i)
        if (!tx.executed) {
          pending.push({
            id: i,
            to: tx.to,
            value: ethers.formatEther(tx.value),
            confirmations: Number(tx.confirmationCount),
            isTokenTransfer: tx.isTokenTransfer,
          })
        }
      }
      
      setPendingTransactions(pending)

      toast({
        title: "Dashboard Updated",
        description: "Latest wallet information has been fetched",
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
      refreshBalances()
    }
  }, [isConnected])

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <CardTitle className="text-sm font-medium text-gray-300">USDC Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatBalance(balances.usdc)} USDC</div>
            <p className="text-xs text-gray-500 mt-1">USD Coin (Base Sepolia)</p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Info and Multisig Status */}
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
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="text-gray-300">Required Approval</span>
                </div>
                <span className="text-sm text-white">{contractInfo.requiredPercentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Multisig Owners</CardTitle>
            <CardDescription className="text-gray-400">Current wallet signers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {contractInfo.owners.length > 0 ? (
                contractInfo.owners.map((owner, index) => (
                  <div key={owner.address} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                    {/* --- UPDATED: Display owner's name and address --- */}
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">
                          {owner.name}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {truncateAddress(owner.address)}
                        </span>
                      </div>
                    </div>
                    {/* --- END UPDATE --- */}
                    <Badge variant="secondary" className="bg-gray-700 text-white">
                      {owner.percentage}%
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400">Loading owners...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transactions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Pending Transactions</CardTitle>
          <CardDescription className="text-gray-400">Transactions awaiting multisig approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingTransactions.length > 0 ? (
              pendingTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">
                      Transaction #{tx.id}
                    </span>
                    <span className="text-xs text-gray-400">
                      {tx.isTokenTransfer ? "Token Transfer" : "ETH Transfer"} to {truncateAddress(tx.to)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-white">{tx.value} {tx.isTokenTransfer ? "" : "ETH"}</span>
                    <Badge variant="outline" className="border-yellow-600 text-yellow-400">
                      {tx.confirmations} confirmations
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400">No pending transactions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}