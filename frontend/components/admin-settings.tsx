"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Shield, User, AlertTriangle } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "@/hooks/use-web3"
import { truncateAddress } from "@/lib/utils"

export function AdminSettings() {
  const { isConnected, walletAddress } = useWeb3()
  const [controllerAddress, setControllerAddress] = useState("")
  const [newOwnerAddress, setNewOwnerAddress] = useState("")
  const [isSettingController, setIsSettingController] = useState(false)
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const checkOwnership = async () => {
      if (!isConnected) return

      try {
        const owner = await web3Service.getOwner()
        setIsOwner(owner.toLowerCase() === walletAddress.toLowerCase())
      } catch (error) {
        console.error("Error checking ownership:", error)
      }
    }

    checkOwnership()
  }, [isConnected, walletAddress])

  const setController = async () => {
    if (!isConnected || !isOwner) {
      toast({
        title: "Permission Denied",
        description: "Only the owner can set a new controller",
        variant: "destructive",
      })
      return
    }

    setIsSettingController(true)
    try {
      const tx = await web3Service.setController(controllerAddress)

      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${truncateAddress(tx.hash)}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      // Wait for transaction to be mined
      const receipt = await tx.wait()

      toast({
        title: "Controller Updated",
        description: `Controller set to ${truncateAddress(controllerAddress)}`,
        className: "bg-green-600 text-white border-green-700",
      })

      setControllerAddress("")
    } catch (error: any) {
      console.error("Set controller error:", error)
      toast({
        title: "Failed to Set Controller",
        description: error.message || "Failed to update controller. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSettingController(false)
    }
  }

  const transferOwnership = async () => {
    if (!isConnected || !isOwner) {
      toast({
        title: "Permission Denied",
        description: "Only the owner can transfer ownership",
        variant: "destructive",
      })
      return
    }

    setIsTransferringOwnership(true)
    try {
      const tx = await web3Service.transferOwnership(newOwnerAddress)

      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${truncateAddress(tx.hash)}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      // Wait for transaction to be mined
      const receipt = await tx.wait()

      toast({
        title: "Ownership Transferred",
        description: `Ownership transferred to ${truncateAddress(newOwnerAddress)}`,
        className: "bg-green-600 text-white border-green-700",
      })

      setNewOwnerAddress("")
      setIsOwner(false) // No longer the owner
    } catch (error: any) {
      console.error("Transfer ownership error:", error)
      toast({
        title: "Failed to Transfer Ownership",
        description: error.message || "Failed to transfer ownership. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTransferringOwnership(false)
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

  if (!isOwner) {
    return (
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-400 justify-center">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Access Denied</span>
          </div>
          <p className="text-red-300 mt-2 text-center">Only the wallet owner can access these settings.</p>
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
            <span className="font-medium">Admin Functions</span>
          </div>
          <p className="text-red-300 mt-2 text-sm">
            These functions can only be executed by the wallet owner. Use with caution as they affect wallet security
            and control.
          </p>
        </CardContent>
      </Card>

      {/* Set Controller */}
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Set Controller</span>
          </CardTitle>
          <CardDescription className="text-gray-400">Update the wallet controller address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="controllerAddress" className="text-gray-300">
              New Controller Address
            </Label>
            <Input
              id="controllerAddress"
              placeholder="0x742d35Cc6634C0532925a3b8D4C9db96590c6C89"
              value={controllerAddress}
              onChange={(e) => setControllerAddress(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!controllerAddress || isSettingController}
              >
                {isSettingController ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting Controller...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Set Controller
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Confirm Controller Change</span>
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  You are about to change the wallet controller. This will affect who can execute transactions.
                  <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                    <strong>New Controller:</strong> {controllerAddress}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={setController} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Confirm Change
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Transfer Ownership */}
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <User className="h-5 w-5 text-yellow-500" />
            <span>Transfer Ownership</span>
          </CardTitle>
          <CardDescription className="text-gray-400">Transfer wallet ownership to another address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="newOwnerAddress" className="text-gray-300">
              New Owner Address
            </Label>
            <Input
              id="newOwnerAddress"
              placeholder="0x742d35Cc6634C0532925a3b8D4C9db96590c6C89"
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={!newOwnerAddress || isTransferringOwnership}
              >
                {isTransferringOwnership ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Transferring...
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Transfer Ownership
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Confirm Ownership Transfer</span>
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  <strong className="text-red-400">WARNING:</strong> You are about to transfer ownership of this wallet.
                  This action cannot be undone and you will lose admin privileges.
                  <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                    <strong>New Owner:</strong> {newOwnerAddress}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={transferOwnership} className="bg-red-600 hover:bg-red-700 text-white">
                  Transfer Ownership
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
