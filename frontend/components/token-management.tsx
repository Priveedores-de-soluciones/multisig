"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Coins, Plus } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "@/hooks/use-web3"
import { POPULAR_TOKENS } from "@/lib/constants"
import { truncateAddress } from "@/lib/utils"

export function TokenManagement() {
  const { isConnected } = useWeb3()
  const [formData, setFormData] = useState({
    tokenAddress: "",
    amount: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const receiveTokens = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to receive tokens",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const tx = await web3Service.receiveTokens(formData.tokenAddress, formData.amount)

      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${truncateAddress(tx.hash)}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      // Wait for transaction to be mined
      const receipt = await tx.wait()

      toast({
        title: "Tokens Received",
        description: `Successfully received ${formData.amount} tokens from ${truncateAddress(formData.tokenAddress)}`,
        className: "bg-green-600 text-white border-green-700",
      })

      // Reset form
      setFormData({
        tokenAddress: "",
        amount: "",
      })
    } catch (error: any) {
      console.error("Token receipt error:", error)
      toast({
        title: "Token Receipt Failed",
        description: error.message || "Failed to receive tokens. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.tokenAddress && formData.amount

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Coins className="h-5 w-5 text-green-500" />
            <span>Receive Tokens</span>
          </CardTitle>
          <CardDescription className="text-gray-400">Add tokens to the wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-gray-300">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="1000"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          <Button
            onClick={receiveTokens}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={!isFormValid || isSubmitting || !isConnected}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Receiving...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Receive Tokens
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Popular Tokens */}
      <Card className="bg-gray-900 border-gray-800 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Popular Tokens</CardTitle>
          <CardDescription className="text-gray-400">Quick add popular ERC-20 tokens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {POPULAR_TOKENS.map((token) => (
              <Button
                key={token.symbol}
                variant="outline"
                className="justify-start border-gray-700 hover:bg-gray-800 text-white bg-transparent"
                onClick={() => handleInputChange("tokenAddress", token.address)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{token.name}</span>
                  <span className="text-xs text-gray-400">{token.symbol}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
