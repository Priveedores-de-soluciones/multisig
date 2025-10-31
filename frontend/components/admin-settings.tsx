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
import { useWeb3 } from "@/hooks/use-web3"
import { truncateAddress } from "@/lib/utils"

export function AdminSettings() {
  const { isConnected, walletAddress } = useWeb3()
  const [owners, setOwners] = useState<any[]>([])
  const [newOwnerAddress, setNewOwnerAddress] = useState("")
  const [newOwnerName, setNewOwnerName] = useState("") // <-- ADDED
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

      // Updated to include 'names' from the new getOwners response
      const formattedOwners = ownersData.addresses.map((addr: string, index: number) => ({
        address: addr,
        name: ownersData.names[index], // <-- ADDED
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
      // --- UPDATED ---
      // Call the new submitAddOwner function
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
      // --- END UPDATE ---

      setNewOwnerAddress("")
      setNewOwnerName("") // <-- ADDED
      setNewOwnerPercentage("")
      
      // Removed optimistic refresh. List will update when proposal is executed.
      
    } catch (error: any) {
      console.error("Add owner error:", error)
      toast({
        title: "Failed to Submit Proposal", // <-- UPDATED
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
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
      // --- UPDATED ---
      // Call the new submitRemoveOwner function
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
      // --- END UPDATE ---

      setRemoveOwnerAddress("")
      
      // Removed optimistic refresh.

    } catch (error: any) {
      console.error("Remove owner error:", error)
      toast({
        title: "Failed to Submit Proposal", // <-- UPDATED
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
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
      // --- UPDATED ---
      // Call the new submitChangeRequiredPercentage function
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
      // --- END UPDATE ---

      setNewRequiredPercentage("")
      
      // Removed optimistic state update.

    } catch (error: any) {
      console.error("Change percentage error:", error)
      toast({
        title: "Failed to Submit Proposal", // <-- UPDATED
        description: error.message || "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
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
      // Pause/Unpause are direct calls, not proposals
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
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <p className="text-gray-400">Please connect your wallet to access admin settings</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Card className="bg-red-900/20 border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Multisig Admin Functions</span>
          </div>
          <p className="text-red-300 mt-2 text-sm">
            {/* UPDATED description */}
            These functions submit **proposals** to modify the multisig contract.
            Proposals must be approved and executed in the Transaction Manager.
          </p>
        </CardContent>
      </Card>

      {/* Contract Status */}
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Contract Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-gray-300">Contract is currently:</span>
              <Badge className={isPaused ? "bg-red-600 text-white" : "bg-green-600 text-white"}>
                {isPaused ? "Paused" : "Active"}
              </Badge>
            </div>
            <Button
              onClick={togglePause}
              disabled={isProcessing}
              variant={isPaused ? "default" : "destructive"}
              className={isPaused ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
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
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>Current Owners</span>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Current multisig owners and their voting power
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {owners.map((owner) => (
              <div key={owner.address} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {/* ADDED name display */}
                  <span className="text-white font-medium">{owner.name}</span>
                  <span className="text-gray-400 font-mono text-sm">{truncateAddress(owner.address)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    {owner.percentage}%
                  </Badge>
                  {!owner.removable && (
                    <Badge variant="outline" className="border-yellow-600 text-yellow-400">
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
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-green-500" />
            <span>Submit Add Owner Proposal</span> {/* UPDATED */}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newOwnerAddress" className="text-gray-300">
              Owner Address
            </Label>
            <Input
              id="newOwnerAddress"
              placeholder="0x..."
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>
          {/* --- ADDED NAME FIELD --- */}
          <div className="space-y-2">
            <Label htmlFor="newOwnerName" className="text-gray-300">
              Owner Name
            </Label>
            <Input
              id="newOwnerName"
              placeholder="e.g. CEO, CTO, etc."
              value={newOwnerName}
              onChange={(e) => setNewOwnerName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>
          {/* --- END --- */}
          <div className="space-y-2">
            <Label htmlFor="newOwnerPercentage" className="text-gray-300">
              Voting Power (%)
            </Label>
            <Input
              id="newOwnerPercentage"
              type="number"
              placeholder="10"
              value={newOwnerPercentage}
              onChange={(e) => setNewOwnerPercentage(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={addOwner}
            // UPDATED disabled check
            disabled={!newOwnerAddress || !newOwnerName || !newOwnerPercentage || isProcessing}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Submit Add Owner Proposal {/* UPDATED */}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Remove Owner */}
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <UserMinus className="h-5 w-5 text-red-500" />
            <span>Submit Remove Owner Proposal</span> {/* UPDATED */}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="removeOwnerAddress" className="text-gray-300">
              Owner Address to Remove
            </Label>
            <Input
              id="removeOwnerAddress"
              placeholder="0x..."
              value={removeOwnerAddress}
              onChange={(e) => setRemoveOwnerAddress(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>
          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            onClick={removeOwner}
            disabled={!removeOwnerAddress || isProcessing}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Submit Remove Owner Proposal {/* UPDATED */}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Change Required Percentage */}
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Percent className="h-5 w-5 text-yellow-500" />
            <span>Submit Change Percentage Proposal</span> {/* UPDATED */}
          </CardTitle>
          <CardDescription className="text-gray-400">
            Current requirement: {currentRequiredPercentage}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newRequiredPercentage" className="text-gray-300">
              New Required Percentage
            </Label>
            <Input
              id="newRequiredPercentage"
              type="number"
              placeholder="51"
              value={newRequiredPercentage}
              onChange={(e) => setNewRequiredPercentage(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>
          <Button
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            onClick={changeRequiredPercentage}
            disabled={!newRequiredPercentage || isProcessing}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Percent className="h-4 w-4 mr-2" />
                Submit Percentage Change {/* UPDATED */}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}