"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { History, Filter, ExternalLink } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "@/hooks/use-web3"
import { ethers } from "ethers"
import { truncateAddress } from "@/lib/utils"

export function TransactionHistory() {
  const { isConnected } = useWeb3()
  const [filter, setFilter] = useState("all")
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTransactionHistory = async () => {
    if (!isConnected) return

    setIsLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(
        web3Service.getCompanyWalletContract().target as string,
        web3Service.getCompanyWalletContract().interface,
        provider,
      )

      // Get events from the last 10000 blocks
      const fromBlock = (await provider.getBlockNumber()) - 10000
      const toBlock = "latest"

      // Fetch different event types
      const txExecutedFilter = contract.filters.TransactionExecuted()
      const tokensReceivedFilter = contract.filters.TokensReceived()
      const controllerChangedFilter = contract.filters.ControllerChanged()

      const [txEvents, tokenEvents, controllerEvents] = await Promise.all([
        contract.queryFilter(txExecutedFilter, fromBlock, toBlock),
        contract.queryFilter(tokensReceivedFilter, fromBlock, toBlock),
        contract.queryFilter(controllerChangedFilter, fromBlock, toBlock),
      ])

      // Process TransactionExecuted events
      const txData = await Promise.all(
        txEvents.map(async (event: any) => {
          const block = await provider.getBlock(event.blockNumber)
          const timestamp = block ? new Date(Number(block.timestamp) * 1000).toLocaleString() : "Unknown"

          return {
            id: event.transactionHash,
            type: "TransactionExecuted",
            timestamp,
            details: `Sent ${ethers.formatEther(event.args[1])} ETH to ${truncateAddress(event.args[0])}`,
            status: event.args[3] ? "Success" : "Failed",
            gasUsed: "21000", // Placeholder, would need tx receipt for actual value
            blockNumber: event.blockNumber.toString(),
          }
        }),
      )

      // Process TokensReceived events
      const tokenData = await Promise.all(
        tokenEvents.map(async (event: any) => {
          const block = await provider.getBlock(event.blockNumber)
          const timestamp = block ? new Date(Number(block.timestamp) * 1000).toLocaleString() : "Unknown"

          return {
            id: event.transactionHash,
            type: "TokensReceived",
            timestamp,
            details: `Received ${ethers.formatUnits(event.args[1], 18)} tokens from ${truncateAddress(event.args[2])}`,
            status: "Success",
            gasUsed: "65000", // Placeholder
            blockNumber: event.blockNumber.toString(),
          }
        }),
      )

      // Process ControllerChanged events
      const controllerData = await Promise.all(
        controllerEvents.map(async (event: any) => {
          const block = await provider.getBlock(event.blockNumber)
          const timestamp = block ? new Date(Number(block.timestamp) * 1000).toLocaleString() : "Unknown"

          return {
            id: event.transactionHash,
            type: "ControllerChanged",
            timestamp,
            details: `Controller changed from ${truncateAddress(event.args[0])} to ${truncateAddress(event.args[1])}`,
            status: "Success",
            gasUsed: "45000", // Placeholder
            blockNumber: event.blockNumber.toString(),
          }
        }),
      )

      // Combine and sort all events by block number (descending)
      const allEvents = [...txData, ...tokenData, ...controllerData].sort(
        (a, b) => Number.parseInt(b.blockNumber) - Number.parseInt(a.blockNumber),
      )

      setTransactions(allEvents)
    } catch (error) {
      console.error("Error fetching transaction history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchTransactionHistory()
    }
  }, [isConnected])

  const filteredTransactions = transactions.filter((tx) => filter === "all" || tx.type === filter)

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "TransactionExecuted":
        return "bg-blue-600 text-white"
      case "TokensReceived":
        return "bg-green-600 text-white"
      case "ControllerChanged":
        return "bg-yellow-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getStatusColor = (status: string) => {
    return status === "Success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
  }

  const openExplorerLink = (txHash: string) => {
    // Replace with the appropriate network explorer URL
    const explorerUrl = `https://etherscan.io/tx/${txHash}`
    window.open(explorerUrl, "_blank")
  }

  if (!isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-gray-400">Please connect your wallet to view transaction history</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center space-x-2">
              <History className="h-5 w-5 text-blue-500" />
              <span>Transaction History</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Complete history of wallet transactions and events
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="TransactionExecuted">Transactions</SelectItem>
                <SelectItem value="TokensReceived">Token Receipts</SelectItem>
                <SelectItem value="ControllerChanged">Controller Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading transaction history...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge className={getEventTypeColor(tx.type)}>{tx.type}</Badge>
                      <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
                    </div>
                    <span className="text-sm text-gray-400">{tx.timestamp}</span>
                  </div>

                  <p className="text-white mb-3">{tx.details}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Transaction Hash:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-white font-mono text-xs">{truncateAddress(tx.id, 10, 8)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                          onClick={() => openExplorerLink(tx.id)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Block Number:</span>
                      <p className="text-white mt-1">{tx.blockNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Gas Used:</span>
                      <p className="text-white mt-1">{tx.gasUsed}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No transactions found for the selected filter</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
