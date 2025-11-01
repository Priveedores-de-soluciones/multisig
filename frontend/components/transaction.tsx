"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { 
  History, 
  Filter, 
  ExternalLink, 
  Loader2, 
  Check, 
  X, 
  ShieldCheck, 
  EyeOff, 
  List,
  Users,
  CheckCircle,
  Clock,
  Bug,
  RefreshCw
} from "lucide-react"
import { web3Service, FullTransaction } from "@/lib/web3"
import { useWeb3 } from "@/hooks/use-web3"
import { ethers } from "ethers"
import { truncateAddress } from "@/lib/utils"
import { POPULAR_TOKENS } from "@/lib/constants"
import { useToast } from "@/components/ui/use-toast"

// NEW interface
interface OwnerDetails {
  address: string
  name: string
  percentage: bigint
}

// UPDATED interface
interface TransactionModalDetails {
  confirmedBy: OwnerDetails[]
  pendingBy: OwnerDetails[]
  initiatorName: string // Changed from initiator
}

export function TransactionManager() {
  const { isConnected } = useWeb3()
  const { toast } = useToast()
  
  const [filter, setFilter] = useState("all")
  const [transactions, setTransactions] = useState<FullTransaction[]>([])
  const [requiredPercentage, setRequiredPercentage] = useState(0)
  const [ignoredTxs, setIgnoredTxs] = useState<Set<string>>(new Set())
  const [selectedTx, setSelectedTx] = useState<FullTransaction | null>(null)
  const [modalDetails, setModalDetails] = useState<TransactionModalDetails | null>(null)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    const storedIgnored = localStorage.getItem("ignoredTxs")
    if (storedIgnored) {
      setIgnoredTxs(new Set(JSON.parse(storedIgnored)))
    }
  }, [])

  const updateIgnoredTxs = (newSet: Set<string>) => {
    setIgnoredTxs(newSet)
    localStorage.setItem("ignoredTxs", JSON.stringify(Array.from(newSet)))
  }

  const handleIgnore = (txId: bigint) => {
    const newSet = new Set(ignoredTxs)
    newSet.add(txId.toString())
    updateIgnoredTxs(newSet)
  }

  const handleUnignore = (txId: bigint) => {
    const newSet = new Set(ignoredTxs)
    newSet.delete(txId.toString())
    updateIgnoredTxs(newSet)
  }

  const getTransactionValue = (tx: FullTransaction): string => {
    if (tx.isTokenTransfer) {
      const token = POPULAR_TOKENS.find(t => t.address.toLowerCase() === tx.tokenAddress.toLowerCase())
      const decimals = token ? token.decimals : 18
      const symbol = token ? token.symbol : "Tokens"
      return `${ethers.formatUnits(tx.value, decimals)} ${symbol}`
    }
    return `${ethers.formatEther(tx.value)} ETH`
  }

  const getTransactionStatus = (tx: FullTransaction): { text: string; color: string } => {
    if (tx.executed) {
      return { text: "Executed", color: "bg-green-600 text-white" }
    }
    const confirmed = Number(tx.confirmationCount)
    if (confirmed >= requiredPercentage) {
      return { text: "Ready to Execute", color: "bg-blue-500 text-white" }
    }
    if (ignoredTxs.has(tx.id.toString())) {
      return { text: "Ignored", color: "bg-gray-700 text-white" }
    }
    if (confirmed > 0) {
      return { text: "Pending", color: "bg-yellow-500 text-black" }
    }
    return { text: "Proposed", color: "bg-gray-600 text-white" }
  }

  const fetchTransactionHistory = useCallback(async () => {
    if (!isConnected) return
    setIsLoading(true)
    try {
      const [txs, reqPercent] = await Promise.all([
        web3Service.getAllTransactions(),
        web3Service.getRequiredPercentage()
      ])
      setTransactions(txs)
      setRequiredPercentage(reqPercent)
    } catch (error: any) {
      console.error("Error fetching transaction history:", error)
      toast({
        variant: "destructive",
        title: "Failed to fetch history",
        description: error.message || "Could not load transactions.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, toast])

  useEffect(() => {
    if (isConnected) {
      fetchTransactionHistory()
    }
  }, [isConnected, fetchTransactionHistory])

  const handleShowDetails = async (tx: FullTransaction) => {
    setSelectedTx(tx)
    setIsModalLoading(true)
    setModalDetails(null)

    try {
      // 1. Fetch all owner data, including names
      // (Assuming web3Service.getOwners() now returns { addresses, names, percentages })
      const { addresses, names, percentages } = await web3Service.getOwners()
      
      // 2. Create a lookup map for all owners
      const ownerMap = new Map<string, { name: string, percentage: bigint }>()
      for (let i = 0; i < addresses.length; i++) {
        ownerMap.set(addresses[i].toLowerCase(), { name: names[i], percentage: percentages[i] })
      }

      // 3. Find initiator's name
      const initiatorAddress = tx.initiator.toLowerCase()
      const initiatorInfo = ownerMap.get(initiatorAddress)
      // Fallback to truncated address if (somehow) not found
      const initiatorName = initiatorInfo ? initiatorInfo.name : truncateAddress(tx.initiator)

      // 4. Build confirmed/pending lists
      const confirmedBy: OwnerDetails[] = []
      const pendingBy: OwnerDetails[] = []

      for (let i = 0; i < addresses.length; i++) {
        const ownerAddress = addresses[i]
        // We can be sure the owner exists in the map
        const ownerInfo = ownerMap.get(ownerAddress.toLowerCase())! 
        
        const hasConfirmed = await web3Service.hasConfirmed(tx.id, ownerAddress)
        
        const ownerDetail: OwnerDetails = {
          address: ownerAddress,
          name: ownerInfo.name,
          percentage: ownerInfo.percentage
        }

        if (hasConfirmed) {
          confirmedBy.push(ownerDetail)
        } else {
          pendingBy.push(ownerDetail)
        }
      }

      // 5. Set the new modal details
      setModalDetails({
        confirmedBy,
        pendingBy,
        initiatorName: initiatorName, 
      })
    } catch (error: any) {
      console.error("Error fetching modal details:", error)
      toast({
        variant: "destructive",
        title: "Failed to fetch details",
        description: error.message,
      })
    } finally {
      setIsModalLoading(false)
    }
  }

  const handleAction = async (action: "confirm" | "revoke" | "execute", txId: bigint) => {
    const key = `${action}-${txId}`
    setActionLoading(prev => ({ ...prev, [key]: true }))
    try {
      let tx: ethers.ContractTransactionResponse
      if (action === "confirm") tx = await web3Service.confirmTransaction(txId)
      else if (action === "revoke") tx = await web3Service.revokeConfirmation(txId)
      else tx = await web3Service.executeTransactionManual(txId)
      
      toast({ title: "Transaction Sent", description: `Waiting for ${action} to be confirmed...` })
      await tx.wait()
      toast({ title: "Success!", description: `Transaction ${action}ed successfully.` })
      
      fetchTransactionHistory()
    } catch (error: any) {
      console.error(`Error ${action}ing transaction:`, error)
      toast({ variant: "destructive", title: `Failed to ${action} transaction`, description: error.message || "An unknown error occurred." })
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleTestCall = async () => {
    setIsTesting(true)
    toast({ title: "Sending Test Transaction..." })
    try {
      const tx = await web3Service.callTestFunction()
      
      toast({
        title: "Test Transaction Sent",
        description: "Waiting for confirmation...",
      })

      await tx.wait()
      
      toast({ 
        title: "Test Successful!", 
        description: "The test function was called.",
        className: "bg-green-600 text-white border-green-700"
      })
    } catch (error: any) {
      console.error("Test function failed:", error)
      toast({ 
        variant: "destructive", 
        title: "Test Failed", 
        description: error.message 
      })
    } finally {
      setIsTesting(false)
    }
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true
    if (filter === "pending") {
      return !tx.executed && !ignoredTxs.has(tx.id.toString())
    }
    if (filter === "executed") return tx.executed
    if (filter === "ignored") return ignoredTxs.has(tx.id.toString())
    return true
  })

  const openExplorerLink = (hash: string) => {
    const explorerUrl = `https://sepolia.basescan.org/tx/${hash}`
    window.open(explorerUrl, "_blank")
  }

  if (!isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-6"><p className="text-gray-400">Please connect your wallet...</p></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
                <List className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                <span>Transaction Manager</span>
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm mt-1">
                Confirm, revoke, and execute all multisig proposals
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleTestCall}
                disabled={isLoading || isTesting}
                className="border-gray-600 hover:bg-gray-800 bg-transparent h-8 w-8 sm:h-9 sm:w-9"
                title="Call Test Function"
              >
                {isTesting ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Bug className="h-3 w-3 sm:h-4 sm:w-4" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchTransactionHistory}
                disabled={isLoading || isTesting}
                className="border-gray-600 hover:bg-gray-800 bg-transparent h-8 w-8 sm:h-9 sm:w-9"
                title="Refresh Transactions"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            
              <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 hidden sm:block" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32 sm:w-48 bg-gray-800 border-gray-700 text-white text-xs sm:text-sm h-8 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400 text-sm">Loading transaction history...</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const status = getTransactionStatus(tx)
                  const value = getTransactionValue(tx)
                  const txIdStr = tx.id.toString()
                  const isIgnored = ignoredTxs.has(txIdStr)
                  
                  return (
                    <Dialog key={txIdStr} onOpenChange={(open) => {
                      if (open) handleShowDetails(tx);
                    }}>
                      <DialogTrigger asChild>
                        <div className="p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-600 cursor-pointer transition-colors">
                          <div className="flex flex-col space-y-2 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={`${status.color} text-xs`}>{status.text}</Badge>
                              <span className="text-white font-mono text-xs sm:text-sm">ID: {txIdStr}</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(Number(tx.timestamp) * 1000).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-white text-sm sm:text-lg font-medium mb-3 break-all">
                            Send {value} to {truncateAddress(tx.to)}
                          </p>

                          <div className="flex flex-col space-y-3">
                            <div className="text-xs sm:text-sm">
                              <span className="text-gray-400">Confirmations:</span>
                              <span className="text-white ml-2 font-medium">
                                {tx.confirmationCount.toString()}% / {requiredPercentage}%
                              </span>
                              {tx.currentUserHasConfirmed && (
                                <span className="ml-2 sm:ml-3 inline-flex items-center text-green-400 text-xs">
                                  <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> You confirmed
                                </span>
                              )}
                            </div>
                            
                            {!tx.executed && (
                              <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {tx.currentUserHasConfirmed ? (
                                  <Button variant="outline" size="sm" className="text-yellow-400 border-yellow-400 hover:bg-yellow-900 hover:text-yellow-300 text-xs h-8"
                                    disabled={actionLoading[`revoke-${txIdStr}`]} onClick={() => handleAction("revoke", tx.id)}>
                                    {actionLoading[`revoke-${txIdStr}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                                    Revoke
                                  </Button>
                                ) : !isIgnored ? (
                                  <>
                                    <Button variant="outline" size="sm" className="text-green-400 border-green-400 hover:bg-green-900 hover:text-green-300 text-xs h-8"
                                      disabled={actionLoading[`confirm-${txIdStr}`]} onClick={() => handleAction("confirm", tx.id)}>
                                      {actionLoading[`confirm-${txIdStr}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                                      Confirm
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200 text-xs h-8"
                                      onClick={() => handleIgnore(tx.id)}>
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Ignore
                                    </Button>
                                  </>
                                ) : (
                                   <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200 text-xs h-8"
                                      onClick={() => handleUnignore(tx.id)}>
                                      <EyeOff className="h-3 w-3 mr-1" />
                                      Un-ignore
                                    </Button>
                                )}
                                
                                {Number(tx.confirmationCount) >= requiredPercentage && (
                                  <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                                    disabled={actionLoading[`execute-${txIdStr}`]} onClick={() => handleAction("execute", tx.id)}>
                                    {actionLoading[`execute-${txIdStr}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                                    Execute
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogTrigger>
                    </Dialog>
                  )
                })
              ) : (
                <div className="text-center py-12">
                  <History className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-sm">No transactions found for this filter</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-[90vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base sm:text-lg">
              Transaction Details (ID: {selectedTx?.id.toString()})
            </DialogTitle>
          </DialogHeader>
          {isModalLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400 text-sm">Loading confirmation details...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-400">To Address:</span>
                  <p className="font-mono break-all">{selectedTx?.to}</p>
                </div>
                <div>
                  <span className="text-gray-400">Value:</span>
                  <p className="font-mono break-all">{selectedTx ? getTransactionValue(selectedTx) : 'N/A'}</p>
                </div>
                
                {/* --- UPDATED INITIATOR --- */}
                <div>
                  <span className="text-gray-400">Initiator:</span>
                  <p className="font-mono break-all">
                    {modalDetails?.initiatorName ? (
                      <>
                        <span className="text-white font-medium">{modalDetails.initiatorName}</span>
                        <span className="text-gray-500 ml-2">({truncateAddress(selectedTx!.initiator)})</span>
                      </>
                    ) : (
                      'N/A'
                    )}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-base sm:text-lg font-semibold mb-2 flex items-center">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-400" />
                  Confirmation Status
                </h4>
                
                {/* --- UPDATED CONFIRMED BY --- */}
                <div className="space-y-2">
                  <span className="text-gray-400 text-xs sm:text-sm">Confirmed By:</span>
                  {modalDetails?.confirmedBy.length === 0 && <p className="text-gray-500 text-xs sm:text-sm">No confirmations yet.</p>}
                  {modalDetails?.confirmedBy.map(owner => (
                    <div key={owner.address} className="flex flex-wrap items-center gap-x-2 text-xs sm:text-sm">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                      <span className="text-white font-medium">{owner.name}</span>
                      <span className="font-mono break-all text-gray-500">{truncateAddress(owner.address)}</span>
                      <span className="text-gray-400">({owner.percentage.toString()}%)</span>
                    </div>
                  ))}
                </div>
                
                {/* --- UPDATED PENDING BY --- */}
                <div className="space-y-2 mt-3">
                  <span className="text-gray-400 text-xs sm:text-sm">Pending Confirmation:</span>
                  {modalDetails?.pendingBy.length === 0 && <p className="text-gray-500 text-xs sm:text-sm">All owners have confirmed.</p>}
                  {modalDetails?.pendingBy.map(owner => (
                    <div key={owner.address} className="flex flex-wrap items-center gap-x-2 text-xs sm:text-sm">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                      <span className="text-white font-medium">{owner.name}</span>
                      <span className="font-mono break-all text-gray-500">{truncateAddress(owner.address)}</span>
                      <span className="text-gray-400">({owner.percentage.toString()}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              <DialogClose asChild>
                <Button variant="outline" className="w-full border-gray-700 hover:bg-gray-800 text-sm">Close</Button>
              </DialogClose>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}