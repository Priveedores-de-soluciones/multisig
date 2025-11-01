"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Shield, Users, AlertTriangle, UserPlus, UserMinus, Percent } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "../hooks/use-web3" // UPDATED PATH
import { truncateAddress } from "@/lib/utils"

export function AdminSettings() {
  const { isConnected, walletAddress } = useWeb3()
  const [owners, setOwners] = useState<any[]>([])
  const [newOwnerAddress, setNewOwnerAddress] = useState("")
  const [newOwnerName, setNewOwnerName] = useState("")
  const [newOwnerPercentage, setNewOwnerPercentage] = useState("")
  const [removeOwnerAddress, setRemoveOwnerAddress] = useState("")
  const [newRequiredPercentage, setNewRequiredPercentage] = useState("")
  const [currentRequiredPercentage, setCurrentRequiredPercentage] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const fetchContractInfo = async () => {
    if (!isConnected) return

    try {
      const [ownersData, reqPercentage, pausedStatus] = await Promise.all([
        web3Service.getOwners(),
        web3Service.getRequiredPercentage(),
        web3Service.isPaused(),
      ])

      const formattedOwners = ownersData.addresses.map((addr: string, index: number) => ({
        address: addr,
        name: ownersData.names[index],
        percentage: Number(ownersData.percentages[index]),
        removable: ownersData.removables[index],
      }))

      setOwners(formattedOwners)
      setCurrentRequiredPercentage(reqPercentage)
      setIsPaused(pausedStatus)
    } catch (error) {
      console.error("Error fetching contract info:", error)
    }
  }
  
  useEffect(() => {
    if (isConnected) {
      fetchContractInfo()
    }
  }, [isConnected])

  const addOwner = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result = await web3Service.submitAddOwner(
        newOwnerAddress,
        newOwnerName,
        Number.parseInt(newOwnerPercentage)
      )

      toast({
        title: "Proposal Submitted",
        description: `Submitting proposal to add owner ${truncateAddress(newOwnerAddress)}. TX ID: ${result.transactionId?.toString() || 'N/A'}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      await result.tx.wait()

      toast({
        title: "Proposal Created",
        description: `Proposal to add ${truncateAddress(newOwnerAddress)} has been submitted for approval.`,
        className: "bg-green-600 text-white border-green-700",
      })

      setNewOwnerAddress("")
      setNewOwnerName("")
      setNewOwnerPercentage("")
      
    } catch (error: any) {
      console.error("Add owner error:", error)
      toast({
        title: "Failed to Submit Proposal",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      fetchContractInfo() // Refresh data after successful transaction
    }
  }

  const removeOwner = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result = await web3Service.submitRemoveOwner(removeOwnerAddress)

      toast({
        title: "Proposal Submitted",
        description: `Submitting proposal to remove owner ${truncateAddress(removeOwnerAddress)}. TX ID: ${result.transactionId?.toString() || 'N/A'}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      await result.tx.wait()

      toast({
        title: "Proposal Created",
        description: `Proposal to remove ${truncateAddress(removeOwnerAddress)} has been submitted for approval.`,
        className: "bg-green-600 text-white border-green-700",
      })

      setRemoveOwnerAddress("")

    } catch (error: any) {
      console.error("Remove owner error:", error)
      toast({
        title: "Failed to Submit Proposal",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      fetchContractInfo() // Refresh data after successful transaction
    }
  }

  const changeRequiredPercentage = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const result = await web3Service.submitChangeRequiredPercentage(Number.parseInt(newRequiredPercentage))

      toast({
        title: "Proposal Submitted",
        description: `Submitting proposal to change percentage to ${newRequiredPercentage}%. TX ID: ${result.transactionId?.toString() || 'N/A'}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      await result.tx.wait()

      toast({
        title: "Proposal Created",
        description: `Proposal to change percentage to ${newRequiredPercentage}% has been submitted for approval.`,
        className: "bg-green-600 text-white border-green-700",
      })

      setNewRequiredPercentage("")

    } catch (error: any) {
      console.error("Change percentage error:", error)
      toast({
        title: "Failed to Submit Proposal",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      fetchContractInfo() // Refresh data after successful transaction
    }
  }

  const togglePause = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const tx = await (isPaused ? web3Service.unpause() : web3Service.pause())

      toast({
        title: "Transaction Submitted",
        description: `${isPaused ? "Unpausing" : "Pausing"} contract...`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      await tx.wait()

      toast({
        title: "Contract Status Updated",
        description: `Contract has been ${isPaused ? "unpaused" : "paused"}`,
        className: "bg-green-600 text-white border-green-700",
      })

      setIsPaused(!isPaused)
    } catch (error: any) {
      console.error("Toggle pause error:", error)
      toast({
        title: "Failed to Toggle Pause",
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-800 w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-gray-400">Please connect your wallet to access admin settings</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Warning Banner */}
      <Card className="bg-red-900/20 border-red-800 w-full">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex items-start space-x-2 text-red-400">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium block sm:inline">Multisig Admin Functions</span>
              <p className="text-red-300 mt-2 text-xs sm:text-sm">
                These functions submit **proposals** to modify the multisig contract.
                Proposals must be approved and executed in the Transaction Manager.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Status */}
      <Card className="bg-gray-900 border-gray-800 w-full max-w-2xl mx-auto">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-white text-lg sm:text-xl">Contract Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-gray-300 text-sm sm:text-base">Contract is currently:</span>
              <Badge className={`${isPaused ? "bg-red-600 text-white" : "bg-green-600 text-white"} text-xs sm:text-sm`}>
                {isPaused ? "Paused" : "Active"}
              </Badge>
            </div>
            <Button
              onClick={togglePause}
              disabled={isProcessing}
              variant={isPaused ? "default" : "destructive"}
              className={`w-full sm:w-auto ${isPaused ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                isPaused ? "Unpause" : "Pause"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Owners */}
      <Card className="bg-gray-900 border-gray-800 w-full max-w-2xl mx-auto">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <span>Current Owners</span>
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs sm:text-sm">
            Current multisig owners and their voting power
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-3">
            {owners.map((owner) => (
              <div key={owner.address} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-800 rounded-lg space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 min-w-0">
                    <span className="text-white font-medium text-sm sm:text-base truncate">{owner.name}</span>
                    <span className="text-gray-400 font-mono text-xs sm:text-sm">{truncateAddress(owner.address)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                    {owner.percentage}%
                  </Badge>
                  {!owner.removable && (
                    <Badge variant="outline" className="border-yellow-600 text-yellow-400 text-xs">
                      Protected
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Owner */}
      <Card className="bg-gray-900 border-gray-800 w-full max-w-2xl mx-auto">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
            <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            <span>Submit Add Owner Proposal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newOwnerAddress" className="text-gray-300 text-sm">
              Owner Address
            </Label>
            <Input
              id="newOwnerAddress"
              placeholder="0x..."
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newOwnerName" className="text-gray-300 text-sm">
              Owner Name
            </Label>
            <Input
              id="newOwnerName"
              placeholder="e.g. CEO, CTO, etc."
              value={newOwnerName}
              onChange={(e) => setNewOwnerName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newOwnerPercentage" className="text-gray-300 text-sm">
              Voting Power (%)
            </Label>
            <Input
              id="newOwnerPercentage"
              type="number"
              placeholder="10"
              value={newOwnerPercentage}
              onChange={(e) => setNewOwnerPercentage(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
            />
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base"
            onClick={addOwner}
            disabled={!newOwnerAddress || !newOwnerName || !newOwnerPercentage || isProcessing}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Submit Add Owner Proposal
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Remove Owner */}
      <Card className="bg-gray-900 border-gray-800 w-full max-w-2xl mx-auto">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
            <UserMinus className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            <span>Submit Remove Owner Proposal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="removeOwnerAddress" className="text-gray-300 text-sm">
              Owner Address to Remove
            </Label>
            <Input
              id="removeOwnerAddress"
              placeholder="0x..."
              value={removeOwnerAddress}
              onChange={(e) => setRemoveOwnerAddress(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
            />
          </div>
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base"
            onClick={removeOwner}
            disabled={!removeOwnerAddress || isProcessing}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Submit Remove Owner Proposal
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Change Required Percentage */}
      <Card className="bg-gray-900 border-gray-800 w-full max-w-2xl mx-auto">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
            <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            <span>Submit Change Percentage Proposal</span>
          </CardTitle>
          <CardDescription className="text-gray-400 text-xs sm:text-sm">
            Current requirement: {currentRequiredPercentage}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newRequiredPercentage" className="text-gray-300 text-sm">
              New Required Percentage
            </Label>
            <Input
              id="newRequiredPercentage"
              type="number"
              placeholder="51"
              value={newRequiredPercentage}
              onChange={(e) => setNewRequiredPercentage(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
            />
          </div>
          <Button
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm sm:text-base"
            onClick={changeRequiredPercentage}
            disabled={!newRequiredPercentage || isProcessing}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Percent className="h-4 w-4 mr-2" />
                Submit Percentage Change
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}