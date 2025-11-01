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
import { Send, AlertTriangle, FileText } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "../hooks/use-web3" // UPDATED PATH
import { truncateAddress } from "@/lib/utils"
import { POPULAR_TOKENS } from "@/lib/constants"

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

  const submitTransaction = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to submit transactions",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      let tokenDecimals = 18
      if (formData.isTokenTransfer && formData.tokenAddress) {
        const token = POPULAR_TOKENS.find(
          t => t.address.toLowerCase() === formData.tokenAddress.toLowerCase()
        )
        if (token) {
          tokenDecimals = token.decimals
        }
      }

      const result = await web3Service.submitTransaction(
        formData.to,
        formData.value,
        formData.isTokenTransfer,
        formData.isTokenTransfer ? formData.tokenAddress : undefined,
        formData.data || "0x",
        tokenDecimals
      )

      toast({
        title: "Transaction Submitted to MultiSig",
        description: `Transaction ID: ${result.transactionId?.toString() || "Pending"}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      const receipt = await result.tx.wait()

      toast({
        title: "Transaction Proposal Created",
        description: `Transaction #${result.transactionId?.toString() || "N/A"} has been submitted for approval`,
        className: "bg-green-600 text-white border-green-700",
      })

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
        description: error.message || "Failed to submit transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.to && formData.value && (!formData.isTokenTransfer || formData.tokenAddress)

  return (
    <Card className="bg-gray-900 border-gray-800 w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
          <span>Submit Transaction</span>
        </CardTitle>
        <CardDescription className="text-gray-400 text-xs sm:text-sm">
          Create a new transaction proposal for the multisig wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-blue-300">
            <strong>Note:</strong> Transactions require approval from multisig owners before execution.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to" className="text-gray-300 text-sm">
            Recipient Address
          </Label>
          <Input
            id="to"
            placeholder="0x742d35Cc6634C0532925a3b8D4C9db96590c6C89"
            value={formData.to}
            onChange={(e) => handleInputChange("to", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="value" className="text-gray-300 text-sm">
            Amount
          </Label>
          <Input
            id="value"
            type="number"
            step="0.000001"
            placeholder="0.0"
            value={formData.value}
            onChange={(e) => handleInputChange("value", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="isTokenTransfer"
            checked={formData.isTokenTransfer}
            onCheckedChange={(checked) => handleInputChange("isTokenTransfer", checked as boolean)}
            className="border-gray-600"
          />
          <Label htmlFor="isTokenTransfer" className="text-gray-300 text-sm">
            Token Transfer
          </Label>
        </div>

        {formData.isTokenTransfer && (
          <div className="space-y-2">
            <Label htmlFor="tokenAddress" className="text-gray-300 text-sm">
              Token Contract Address
            </Label>
            <Input
              id="tokenAddress"
              placeholder="0xA0b86a33E6441E6C7D3E4C5B4B6C7D8E9F0A1B2C"
              value={formData.tokenAddress}
              onChange={(e) => handleInputChange("tokenAddress", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {POPULAR_TOKENS.filter(t => t.address !== "0x0000000000000000000000000000000000000000").map((token) => (
                <Button
                  key={token.symbol}
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange("tokenAddress", token.address)}
                  className="border-gray-700 hover:bg-gray-800 text-gray-300 text-xs"
                >
                  {token.symbol}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="data" className="text-gray-300 text-sm">
            Transaction Data (Optional)
          </Label>
          <Textarea
            id="data"
            placeholder="0x..."
            value={formData.data}
            onChange={(e) => handleInputChange("data", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm"
            rows={3}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
              disabled={!isFormValid || isSubmitting || !isConnected}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Transaction
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-900 border-gray-800 max-w-[90vw] sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center space-x-2 text-base sm:text-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                <span>Confirm Transaction Submission</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400 text-xs sm:text-sm">
                You are about to submit a transaction proposal to the multisig wallet:
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-800 rounded-lg space-y-2 text-xs sm:text-sm">
                  <div className="break-all">
                    <strong>To:</strong> {formData.to}
                  </div>
                  <div>
                    <strong>Amount:</strong> {formData.value} {formData.isTokenTransfer ? "tokens" : "ETH"}
                  </div>
                  {formData.isTokenTransfer && (
                    <div className="break-all">
                      <strong>Token:</strong> {formData.tokenAddress}
                    </div>
                  )}
                </div>
                <p className="mt-3 sm:mt-4 text-yellow-400 text-xs sm:text-sm">
                  This transaction will require approval from multisig owners before execution.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0">
              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 w-full sm:w-auto">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={submitTransaction} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                Submit Proposal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
