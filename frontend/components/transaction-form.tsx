"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
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
import { Send, AlertTriangle } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "@/hooks/use-web3"
import { truncateAddress } from "@/lib/utils"

export function TransactionForm() {
  const { isConnected } = useWeb3()
  const [formData, setFormData] = useState({
    to: "",
    value: "",
    isTokenTransfer: false,
    tokenAddress: "",
    data: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const executeTransaction = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to execute transactions",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const tx = await web3Service.executeTransaction(
        formData.to,
        formData.value,
        formData.isTokenTransfer,
        formData.isTokenTransfer ? formData.tokenAddress : undefined,
        formData.data || "0x",
      )

      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${truncateAddress(tx.hash)}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      // Wait for transaction to be mined
      const receipt = await tx.wait()

      toast({
        title: "Transaction Executed",
        description: `Successfully sent ${formData.value} ${formData.isTokenTransfer ? "tokens" : "ETH"} to ${truncateAddress(formData.to)}`,
        className: "bg-green-600 text-white border-green-700",
      })

      // Reset form
      setFormData({
        to: "",
        value: "",
        isTokenTransfer: false,
        tokenAddress: "",
        data: "",
      })
    } catch (error: any) {
      console.error("Transaction error:", error)
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to execute transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.to && formData.value && (!formData.isTokenTransfer || formData.tokenAddress)

  return (
    <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Send className="h-5 w-5 text-blue-500" />
          <span>Execute Transaction</span>
        </CardTitle>
        <CardDescription className="text-gray-400">Send ETH or tokens from the wallet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="to" className="text-gray-300">
            Recipient Address
          </Label>
          <Input
            id="to"
            placeholder="0x742d35Cc6634C0532925a3b8D4C9db96590c6C89"
            value={formData.to}
            onChange={(e) => handleInputChange("to", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="value" className="text-gray-300">
            Amount
          </Label>
          <Input
            id="value"
            type="number"
            placeholder="0.0"
            value={formData.value}
            onChange={(e) => handleInputChange("value", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isTokenTransfer"
            checked={formData.isTokenTransfer}
            onCheckedChange={(checked) => handleInputChange("isTokenTransfer", checked as boolean)}
            className="border-gray-600"
          />
          <Label htmlFor="isTokenTransfer" className="text-gray-300">
            Token Transfer
          </Label>
        </div>

        {formData.isTokenTransfer && (
          <div className="space-y-2">
            <Label htmlFor="tokenAddress" className="text-gray-300">
              Token Contract Address
            </Label>
            <Input
              id="tokenAddress"
              placeholder="0xA0b86a33E6441E6C7D3E4C5B4B6C7D8E9F0A1B2C"
              value={formData.tokenAddress}
              onChange={(e) => handleInputChange("tokenAddress", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="data" className="text-gray-300">
            Transaction Data (Optional)
          </Label>
          <Textarea
            id="data"
            placeholder="0x..."
            value={formData.data}
            onChange={(e) => handleInputChange("data", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            rows={3}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!isFormValid || isSubmitting || !isConnected}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Executing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Execute Transaction
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-900 border-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Confirm Transaction</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                You are about to execute a transaction. Please review the details:
                <div className="mt-4 p-4 bg-gray-800 rounded-lg space-y-2">
                  <div>
                    <strong>To:</strong> {formData.to}
                  </div>
                  <div>
                    <strong>Amount:</strong> {formData.value} {formData.isTokenTransfer ? "tokens" : "ETH"}
                  </div>
                  {formData.isTokenTransfer && (
                    <div>
                      <strong>Token:</strong> {formData.tokenAddress}
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={executeTransaction} className="bg-red-600 hover:bg-red-700 text-white">
                Confirm & Execute
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
