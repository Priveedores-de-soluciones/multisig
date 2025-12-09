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
  RefreshCw,
  TimerOff,
  Timer
} from "lucide-react"
import { web3Service, FullTransaction } from "@/lib/web3"
import { useWeb3 } from "@/hooks/use-web3" 
import { ethers } from "ethers"
import { truncateAddress } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { MULTISIG_CONTROLLER_ABI, COMPANY_WALLET_ABI } from "@/lib/abis" 
import { Token } from "@/lib/constants"


interface OwnerDetails {
  address: string
  name: string
  percentage: bigint
}

interface TransactionModalDetails {
  confirmedBy: OwnerDetails[]
  pendingBy: OwnerDetails[]
  initiatorName: string
}

// ---------------------------------------------
// --- COUNTDOWN COMPONENT ---
// ---------------------------------------------
function CountdownTimer({ 
  expiryTimestamp, 
  onExpired 
}: { 
  expiryTimestamp: bigint
  onExpired?: () => void 
}) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [urgencyColor, setUrgencyColor] = useState<string>("text-green-400")

  useEffect(() => {
    const updateCountdown = () => {
      const now = BigInt(Math.floor(Date.now() / 1000))
      const remaining = Number(expiryTimestamp - now)

      if (remaining <= 0) {
        setTimeLeft("Expired")
        setUrgencyColor("text-red-500")
        if (onExpired) onExpired()
        return
      }

      // Calculate time units
      const days = Math.floor(remaining / 86400)
      const hours = Math.floor((remaining % 86400) / 3600)
      const minutes = Math.floor((remaining % 3600) / 60)
      const seconds = remaining % 60

      // Format display
      let display = ""
      if (days > 0) display += `${days}d `
      if (hours > 0 || days > 0) display += `${hours}h `
      if (minutes > 0 || hours > 0 || days > 0) display += `${minutes}m `
      display += `${seconds}s`

      setTimeLeft(display.trim())

      // Set urgency color based on remaining time
      const totalSeconds = remaining
      if (totalSeconds > 86400) { // > 1 day
        setUrgencyColor("text-green-400")
      } else if (totalSeconds > 3600) { // > 1 hour
        setUrgencyColor("text-yellow-400")
      } else if (totalSeconds > 600) { // > 10 minutes
        setUrgencyColor("text-orange-400")
      } else {
        setUrgencyColor("text-red-500 animate-pulse")
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [expiryTimestamp, onExpired])

  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${urgencyColor}`}>
      <Timer className="h-3 w-3" />
      <span>{timeLeft}</span>
    </div>
  )
}

// ---------------------------------------------
// --- TRANSACTION DECODING LOGIC ---
// ---------------------------------------------
const CONTROLLER_INTERFACE = new ethers.Interface(MULTISIG_CONTROLLER_ABI)
const WALLET_INTERFACE = new ethers.Interface(COMPANY_WALLET_ABI)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)"
]
const ERC20_INTERFACE = new ethers.Interface(ERC20_ABI)

const getTransactionValue = (tx: FullTransaction, allTokens: readonly Token[]): string => {
  if (tx.isTokenTransfer) {
    const token = allTokens.find(t => t.address.toLowerCase() === tx.tokenAddress.toLowerCase())
    const decimals = token ? token.decimals : 18
    const symbol = token ? token.symbol : "Tokens"
    return `${ethers.formatUnits(tx.value, decimals)} ${symbol}`
  }
  const nativeToken = allTokens.find(t => t.address === ethers.ZeroAddress)
  const nativeSymbol = nativeToken ? nativeToken.symbol : "ETH"
  return `${ethers.formatEther(tx.value)} ${nativeSymbol}`
}

const getTransactionDescription = (
  tx: FullTransaction, 
  contractAddresses: { controller: string, wallet: string },
  allTokens: readonly Token[]
): string => {
  const toAddress = tx.to.toLowerCase()
  const controllerAddress = contractAddresses.controller.toLowerCase()
  const walletAddress = contractAddresses.wallet.toLowerCase()

  if (toAddress === controllerAddress) {
    try {
      const decoded = CONTROLLER_INTERFACE.parseTransaction({ data: tx.data })
      
      if (decoded) {
        switch (decoded.name) {
          case 'submitAddOwner':
            return `🔥 PROPOSAL: Add Owner ${decoded.args[1]} (${decoded.args[2].toString()}%)`
          case 'submitRemoveOwner':
            return `❌ PROPOSAL: Remove Owner ${truncateAddress(decoded.args[0])}`
          case 'submitChangeRequiredPercentage':
            return `⚙️ PROPOSAL: Change Required % to ${decoded.args[0].toString()}%`
          case 'pause':
            return `⏸️ PROPOSAL: Pause Controller`
          case 'unpause':
            return `▶️ PROPOSAL: Unpause Controller`
          case 'test':
            return `🐞 CALL TEST FUNCTION (Controller)`
          default:
            return `Controller Action: ${decoded.name}`
        }
      }
    } catch (e) {}
  }

  if (toAddress === walletAddress) {
    try {
      const decoded = WALLET_INTERFACE.parseTransaction({ data: tx.data })
      if (decoded) {
        switch(decoded.name) {
          case 'executeTransaction':
            const innerTo = decoded.args[0]
            const innerIsToken = decoded.args[2]
            const innerValue = innerIsToken 
              ? getTransactionValue({ ...tx, to: innerTo, value: decoded.args[1], tokenAddress: decoded.args[3] }, allTokens) 
              : getTransactionValue({ ...tx, to: innerTo, value: decoded.args[1] }, allTokens)
            
            try {
              const innerDataDecoded = ERC20_INTERFACE.parseTransaction({ data: decoded.args[4] })
              if (innerDataDecoded?.name === 'approve') {
                return `🔑 Wallet Action: ERC20 **Approve** on ${truncateAddress(innerTo)}`
              }
            } catch {}

            return `⚡ Wallet Execution: Send ${innerValue} to ${truncateAddress(innerTo)}`
          
          case 'setController':
            return `🔗 Wallet Action: Change Controller to ${truncateAddress(decoded.args[0])}`
          case 'renounceOwnership':
             return `🚫 Wallet Action: Renounce Ownership`
          default:
            return `Wallet Action: ${decoded.name}`
        }
      }
    } catch (e) {}
  }

  if (tx.isTokenTransfer) {
    const value = getTransactionValue(tx, allTokens) 
    try {
        const decoded = ERC20_INTERFACE.parseTransaction({ data: tx.data })
        if (decoded?.name === 'transfer') {
             return `💰 Send ${value} to ${truncateAddress(decoded.args[0])}`
        }
        if (decoded?.name === 'approve') {
             return `🔑 ERC20 Approve on ${truncateAddress(tx.to)}`
        }
    } catch (e) {}
    return `🔗 Token Interaction: ${value} to ${truncateAddress(tx.to)}`
  }
  
  if (tx.data === "0x" && tx.value > 0n) {
    const nativeToken = allTokens.find(t => t.address === ethers.ZeroAddress)
    const value = ethers.formatEther(tx.value)
    return `💸 Send ${value} ${nativeToken?.symbol || 'ETH'} to ${truncateAddress(tx.to)}`
  }

  if (tx.data !== "0x") {
    const functionSig = tx.data.substring(0, 10)
    return `📜 Contract Interaction (${functionSig}...) to ${truncateAddress(tx.to)}`
  }

  return `❓ Unknown Transaction to ${truncateAddress(tx.to)}`
}

// ---------------------------------------------
// --- COMPONENT START ---
// ---------------------------------------------
export function TransactionManager() {
  const { isConnected } = useWeb3()
  const { toast } = useToast()
  
  const [filter, setFilter] = useState("all")
  const [transactions, setTransactions] = useState<FullTransaction[]>([])
  const [requiredPercentage, setRequiredPercentage] = useState(0)
  const [expiryPeriod, setExpiryPeriod] = useState(0n)
  const [timelockPeriod, setTimelockPeriod] = useState(0n)
  
  const [ignoredTxs, setIgnoredTxs] = useState<Set<string>>(new Set())
  const [selectedTx, setSelectedTx] = useState<FullTransaction | null>(null)
  const [modalDetails, setModalDetails] = useState<TransactionModalDetails | null>(null)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [isTesting, setIsTesting] = useState(false)
  
  const [contractAddresses, setContractAddresses] = useState({ controller: "", wallet: "" })
  const [popularTokens, setPopularTokens] = useState<readonly Token[]>([])
  const [explorerBaseUrl, setExplorerBaseUrl] = useState("")

  useEffect(() => {
    const storedIgnored = localStorage.getItem("ignoredTxs")
    if (storedIgnored) {
      setIgnoredTxs(new Set(JSON.parse(storedIgnored)))
    }
  }, [])
  
  const fetchChainData = useCallback(async () => {
    if (!isConnected) return
    
    try {
      const [walletAddr, controllerAddr, allTokens, networkInfo] = await Promise.all([
        web3Service.getCompanyWalletAddress(),
        web3Service.getController(),
        web3Service.getPopularTokens(),
        web3Service.getNetworkInfo(),
      ])

      setContractAddresses({ controller: controllerAddr, wallet: walletAddr })
      setPopularTokens(allTokens)
      
      let explorerUrl = "https://etherscan.io";
      if (networkInfo?.chainId === 84532) explorerUrl = "https://sepolia.basescan.org";
      else if (networkInfo?.chainId === 421614) explorerUrl = "https://sepolia.arbiscan.io";
      else if (networkInfo?.chainId === 11142220) explorerUrl = "https://celo-sepolia.celoscan.io";
      setExplorerBaseUrl(explorerUrl);
      
    } catch (error) {
      console.error("Error fetching chain data for decoding:", error)
      setContractAddresses({ controller: "0x0", wallet: "0x0" }) 
      setPopularTokens([])
    }
  }, [isConnected])

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

  const getTransactionStatus = (tx: FullTransaction): { text: string; color: string } => {
    const nowInSeconds = BigInt(Math.floor(Date.now() / 1000))
    const expiryTimestamp = tx.timestamp + expiryPeriod
    
    if (tx.executed) {
      return { text: "Executed", color: "bg-green-600 text-white" }
    }
    
    if (expiryPeriod > 0n && nowInSeconds > expiryTimestamp) {
        return { text: "Expired", color: "bg-red-700 text-white" } 
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
    
    await fetchChainData(); 
    
    try {
      const [txs, reqPercent, expirySecs, timelockSecs] = await Promise.all([
        web3Service.getAllTransactions(),
        web3Service.getRequiredPercentage(),
        web3Service.getExpiryPeriod(),
        web3Service.getTimelockPeriod(),
      ])
      setTransactions(txs)
      setRequiredPercentage(reqPercent)
      setExpiryPeriod(expirySecs)
      setTimelockPeriod(timelockSecs) 
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
  }, [isConnected, toast, fetchChainData])

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
      const { addresses, names, percentages } = await web3Service.getOwners()
      
      const ownerMap = new Map<string, { name: string, percentage: bigint }>()
      for (let i = 0; i < addresses.length; i++) {
        ownerMap.set(addresses[i].toLowerCase(), { name: names[i], percentage: percentages[i] })
      }

      const initiatorAddress = tx.initiator.toLowerCase()
      const initiatorInfo = ownerMap.get(initiatorAddress)
      const initiatorName = initiatorInfo ? initiatorInfo.name : truncateAddress(tx.initiator)

      const confirmedBy: OwnerDetails[] = []
      const pendingBy: OwnerDetails[] = []

      for (let i = 0; i < addresses.length; i++) {
        const ownerAddress = addresses[i]
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
    const status = getTransactionStatus(tx).text

    if (filter === "all") return true
    if (filter === "pending") {
      return !tx.executed && !ignoredTxs.has(tx.id.toString()) && status !== "Expired"
    }
    if (filter === "executed") return tx.executed
    if (filter === "ignored") return ignoredTxs.has(tx.id.toString())
    if (filter === "expired") return status === "Expired"
    return true
  })

  const isDataReady = contractAddresses.controller && contractAddresses.wallet && popularTokens.length > 0;
  
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
        <CardHeader className="pb-3 sm:pb-6 px-4 sm:px-6">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-white flex items-center space-x-2 text-base sm:text-lg md:text-xl">
                <List className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
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
                <SelectTrigger className="w-28 sm:w-48 bg-gray-800 border-gray-700 text-white text-xs sm:text-sm h-8 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem> 
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {isLoading || !isDataReady ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400 text-sm">Loading transaction history and chain data...</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const status = getTransactionStatus(tx)
                  const description = getTransactionDescription(tx, contractAddresses, popularTokens)
                  
                  const txIdStr = tx.id.toString()
                  const isIgnored = ignoredTxs.has(txIdStr)
                  const isExpired = status.text === "Expired"
                  const expiryTimestamp = tx.timestamp + expiryPeriod

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
                              
                              {/* Countdown Timer - Show for pending/proposed transactions only */}
                              {!tx.executed && !isExpired && expiryPeriod > 0n && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">Expires:</span>
                                  <CountdownTimer 
                                    expiryTimestamp={expiryTimestamp}
                                    onExpired={() => fetchTransactionHistory()}
                                  />
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">
                              Submitted: {new Date(Number(tx.timestamp) * 1000).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-white text-sm sm:text-base font-medium mb-3 break-all">
                            {description}
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
                            
                            {!tx.executed && !isExpired && (
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
                                  <>
                                    {(() => {
                                      const nowInSeconds = BigInt(Math.floor(Date.now() / 1000))
                                      const executionTime = tx.timestamp + timelockPeriod
                                      const canExecute = nowInSeconds >= executionTime
                                      
                                      if (canExecute) {
                                        return (
                                          <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                                            disabled={actionLoading[`execute-${txIdStr}`]} onClick={() => handleAction("execute", tx.id)}>
                                            {actionLoading[`execute-${txIdStr}`] ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                                            Execute
                                          </Button>
                                        )
                                      } else {
                                        return (
                                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border border-blue-500/50 rounded text-xs">
                                            <Clock className="h-3 w-3 text-blue-400" />
                                            <span className="text-blue-300">Execute in:</span>
                                            <CountdownTimer 
                                              expiryTimestamp={executionTime}
                                              onExpired={() => fetchTransactionHistory()}
                                            />
                                          </div>
                                        )
                                      }
                                    })()}
                                  </>
                                )}
                              </div>
                            )}
                            {isExpired && (
                                <p className="text-red-500 text-xs sm:text-sm flex items-center">
                                    <TimerOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0"/> This transaction has expired and can no longer be acted upon.
                                </p>
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

      {/* Transaction Details Modal */}
      <Dialog open={selectedTx !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedTx(null)
          setModalDetails(null)
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>Transaction Details</span>
              {selectedTx && (
                <a 
                  href={`${explorerBaseUrl}/tx/${selectedTx.hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> View on Explorer
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {isModalLoading || !modalDetails ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400 text-sm">Loading details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Initiator</h3>
                <p className="text-white text-sm">{modalDetails.initiatorName} ({selectedTx!.initiator})</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Confirmed By</h3>
                {modalDetails.confirmedBy.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {modalDetails.confirmedBy.map((owner) => (
                      <li key={owner.address} className="text-white text-sm">
                        {owner.name} ({owner.address}) - {owner.percentage.toString()}%
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No confirmations yet.</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Pending Confirmation From</h3>
                {modalDetails.pendingBy.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {modalDetails.pendingBy.map((owner) => (
                      <li key={owner.address} className="text-white text-sm">
                        {owner.name} ({owner.address}) - {owner.percentage.toString()}%
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">All owners have confirmed.</p>
                )}
              </div>
            </div>
          )}
          
          <DialogClose asChild>
            <Button variant="outline" className="mt-6 w-full">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}