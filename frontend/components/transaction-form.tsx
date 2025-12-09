"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ethers } from "ethers"
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
import { Send, AlertTriangle, FileText, Wallet, Building2 } from "lucide-react"
import { web3Service } from "@/lib/web3"
import { useWeb3 } from "../hooks/use-web3"
import { Token } from "@/lib/constants"
import { COMPANY_WALLET_ABI } from "@/lib/abis"
const MULTISIG_ADDRESS = "0xbf2bC2c21C1A3290542e5fd0eaee6E56f5ff4230"



function CurrencySelect({ 
    tokens, 
    value, 
    onChange 
}: { 
    tokens: readonly Token[], 
    value: string, 
    onChange: (address: string) => void 
}) {
    const nativeToken = tokens.find(t => t.address === ethers.ZeroAddress);

    return (
        <select
            id="tokenAddress"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 sm:h-10 px-2 sm:px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
        >
            <option value="" disabled className="text-gray-500">
                Select currency...
            </option>
            
            {nativeToken && (
                <option value={nativeToken.address}>
                    {nativeToken.symbol} (Native)
                </option>
            )}

            {tokens
                .filter(t => t.address !== ethers.ZeroAddress)
                .map((token) => (
                    <option key={token.address} value={token.address}>
                        {token.symbol} ({token.name})
                    </option>
                ))}
        </select>
    )
}

export function TransactionForm() {
  const { isConnected, provider } = useWeb3() 
  
  const [formData, setFormData] = useState({
    to: "",
    value: "",
    tokenAddress: "",
    data: "",
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [popularTokens, setPopularTokens] = useState<readonly Token[]>([])
  const [vaultBalance, setVaultBalance] = useState<string>("0") 
  const { toast } = useToast()
  
  const selectedToken = useMemo(() => {
    return popularTokens.find(
        t => t.address.toLowerCase() === formData.tokenAddress.toLowerCase()
    )
  }, [formData.tokenAddress, popularTokens])

  // Fetch tokens
  useEffect(() => {
    const fetchTokens = async () => {
      if (isConnected) {
        try {
          console.log("🔄 Fetching popular tokens...")
          const tokens = await web3Service.getPopularTokens()
          console.log("✅ Popular tokens fetched:", tokens)
          setPopularTokens(tokens)
          
          const nativeToken = tokens.find(t => t.address === ethers.ZeroAddress)
          if (nativeToken && !formData.tokenAddress) {
              console.log("🎯 Setting default token to native:", nativeToken.symbol)
              setFormData(prev => ({ ...prev, tokenAddress: nativeToken.address }))
          }
          
        } catch (e) {
          console.error("❌ Failed to fetch popular tokens:", e)
        }
      } else {
        console.log("⚠️ Wallet not connected, clearing tokens")
        setPopularTokens([])
        setFormData(prev => ({ ...prev, tokenAddress: "" }))
      }
    }
    fetchTokens()
  }, [isConnected])

  // ---------------------------------------------------------
  // Fetch Multisig Wallet Balance
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchMultisigBalance = async () => {
      if (!isConnected || !selectedToken) {
        console.log("❌ Missing requirements:", { isConnected, hasSelectedToken: !!selectedToken })
        setVaultBalance("0")
        return
      }

      console.log("🏦 Fetching multisig wallet balance...")
      console.log("📊 Selected Token:", {
        symbol: selectedToken.symbol,
        address: selectedToken.address,
        decimals: selectedToken.decimals
      })

      try {
        let formattedBalance: string;

        if (selectedToken.address === ethers.ZeroAddress) {
          // Use web3Service to get native token balance
          console.log("💰 Fetching native token balance from multisig via web3Service...")
          formattedBalance = await web3Service.getBalance()
          console.log("✅ Native balance:", formattedBalance)
        } else {
          // Use web3Service to get ERC20 token balance
          console.log("🪙 Fetching ERC20 token balance from multisig via web3Service...")
          console.log("🔍 Token Address:", selectedToken.address)
          formattedBalance = await web3Service.getTokenBalance(selectedToken.address, selectedToken.decimals)
          console.log("✅ Token balance:", formattedBalance)
        }

        console.log("💵 Formatted multisig balance:", formattedBalance, selectedToken.symbol)
        setVaultBalance(formattedBalance)
      } catch (error) {
        console.error("❌ Error fetching multisig wallet balance:", error)
        setVaultBalance("0")
      }
    }

    fetchMultisigBalance()
  }, [selectedToken, isConnected])


  const handleInputChange = (field: string, value: string) => {
    console.log(`📝 Input changed - ${field}:`, value)
    setFormData((prev) => ({ ...prev, [field]: value }))
  }
  
  const handleCurrencySelect = (address: string) => {
      console.log("💱 Currency selected:", address)
      setFormData((prev) => ({ ...prev, tokenAddress: address }))
  }

  // Handle Percentage Clicks
  const handlePercentageClick = (percentage: number) => {
      console.log(`📊 Percentage clicked: ${percentage}%`)
      if (!vaultBalance) {
        console.log("⚠️ No vault balance available")
        return
      }

      const balanceFloat = parseFloat(vaultBalance)
      if (isNaN(balanceFloat) || balanceFloat === 0) {
        console.log("⚠️ Invalid or zero balance")
        setFormData(prev => ({ ...prev, value: "0" }))
        return
      }

      let newValue = balanceFloat * (percentage / 100)
      
      let valueString = percentage === 100 
        ? vaultBalance 
        : newValue.toFixed(6).replace(/\.?0+$/, "")

      console.log(`✅ Calculated ${percentage}% of ${vaultBalance}:`, valueString)
      setFormData(prev => ({ ...prev, value: valueString }))
  }

  const submitTransaction = async () => {
    if (!isConnected) {
      console.log("❌ Wallet not connected")
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to submit transactions",
        variant: "destructive",
      })
      return
    }

    console.log("🚀 Starting transaction submission...")
    console.log("📋 Transaction details:", {
      to: formData.to,
      value: formData.value,
      token: selectedToken?.symbol,
      tokenAddress: selectedToken?.address,
      data: formData.data || "0x"
    })

    setIsSubmitting(true)
    try {
      if (!selectedToken) {
          console.error("❌ No token selected")
          throw new Error("Please select a valid currency for transfer.")
      }
      
      const isTokenTransfer = selectedToken.address !== ethers.ZeroAddress
      const tokenDecimals = selectedToken.decimals

      console.log("📤 Submitting to web3Service...", {
        isTokenTransfer,
        tokenDecimals
      })

      const result = await web3Service.submitTransaction(
        formData.to,
        formData.value,
        isTokenTransfer,
        selectedToken.address,
        formData.data || "0x",
        tokenDecimals
      )

      console.log("✅ Transaction submitted:", result)

      toast({
        title: "Transaction Submitted to MultiSig",
        description: `Transaction ID: ${result.transactionId?.toString() || "Pending"}`,
        className: "bg-blue-600 text-white border-blue-700",
      })

      console.log("⏳ Waiting for transaction confirmation...")
      await result.tx.wait()
      console.log("✅ Transaction confirmed on blockchain")

      toast({
        title: "Transaction Proposal Created",
        description: `Transaction #${result.transactionId?.toString() || "N/A"} has been submitted for approval`,
        className: "bg-green-600 text-white border-green-700",
      })

      console.log("🔄 Resetting form...")
      const nativeTokenAddress = popularTokens.find(t => t.address === ethers.ZeroAddress)?.address || ""
      setFormData({
        to: "",
        value: "",
        tokenAddress: nativeTokenAddress,
        data: "",
      })
      console.log("✅ Form reset complete")
    } catch (error: any) {
      console.error("❌ Transaction error:", error)
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to submit transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      console.log("🏁 Transaction submission process complete")
    }
  }

  const isFormValid = formData.to && formData.value && formData.tokenAddress

  return (
    <Card className="bg-gray-900 border-gray-800 w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3 sm:pb-6 px-4 sm:px-6">
        <CardTitle className="text-white flex items-center space-x-2 text-base sm:text-lg md:text-xl">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
          <span>Submit Transaction</span>
        </CardTitle>
        <CardDescription className="text-gray-400 text-xs sm:text-sm">
          Create a new transaction proposal for the multisig wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        
        {/* Recipient Input */}
        <div className="space-y-2">
          <Label htmlFor="to" className="text-gray-300 text-xs sm:text-sm">
            Recipient Address
          </Label>
          <Input
            id="to"
            placeholder="0x..."
            value={formData.to}
            onChange={(e) => handleInputChange("to", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-xs sm:text-sm font-mono h-9 sm:h-10"
          />
        </div>

        {/* Amount and Currency Group */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="value" className="text-gray-300 text-xs sm:text-sm">
                  Amount
                </Label>
                {/* Multisig Vault Balance Display */}
                {selectedToken && (
                    <div className="flex items-center text-xs text-blue-400 space-x-1" title="Multisig Wallet Balance">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[100px] sm:max-w-none">
                          Vault: {parseFloat(vaultBalance).toFixed(4)}
                        </span>
                    </div>
                )}
              </div>
              
              <Input
                id="value"
                type="number"
                step="0.000001"
                placeholder="0.0"
                value={formData.value}
                onChange={(e) => handleInputChange("value", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-xs sm:text-sm h-9 sm:h-10"
              />
              
              {/* Percentage Buttons */}
              <div className="flex justify-between gap-1.5 sm:gap-2 mt-2">
                {[25, 50, 75, 100].map((percent) => (
                    <button
                        key={percent}
                        type="button"
                        onClick={() => handlePercentageClick(percent)}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 text-xs py-1.5 sm:py-2 rounded transition-colors"
                    >
                        {percent === 100 ? "Max" : `${percent}%`}
                    </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-gray-300 text-xs sm:text-sm">
                Currency
              </Label>
              <CurrencySelect 
                tokens={popularTokens}
                value={formData.tokenAddress}
                onChange={handleCurrencySelect}
              />
            </div>
        </div>

        {/* Transaction Data Input */}
        <div className="space-y-2 pt-2">
          <Label htmlFor="data" className="text-gray-300 text-xs sm:text-sm">
            Transaction Data (Optional)
          </Label>
          <Textarea
            id="data"
            placeholder="0x..."
            value={formData.data}
            onChange={(e) => handleInputChange("data", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-xs sm:text-sm font-mono min-h-[80px] sm:min-h-[90px]"
            rows={3}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base mt-2 h-10 sm:h-11"
              disabled={!isFormValid || isSubmitting || !isConnected}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="hidden xs:inline">Submitting...</span>
                  <span className="xs:hidden">...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Submit Transaction</span>
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-900 border-gray-800 max-w-[95vw] sm:max-w-lg mx-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center space-x-2 text-sm sm:text-base md:text-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                <span>Confirm Transaction</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400 text-xs sm:text-sm">
                You are about to submit a transaction proposal to the multisig wallet:
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-800 rounded-lg space-y-2 text-xs sm:text-sm">
                  <div className="break-all">
                    <strong className="text-gray-300">To:</strong> 
                    <span className="text-gray-400 ml-1 block sm:inline mt-1 sm:mt-0">{formData.to}</span>
                  </div>
                  <div>
                    <strong className="text-gray-300">Amount:</strong> 
                    <span className="text-gray-400 ml-1">{formData.value} {selectedToken?.symbol || "Unknown"}</span>
                  </div>
                  <div className="break-all">
                    <strong className="text-gray-300">Token:</strong> 
                    <span className="text-gray-400 ml-1 block sm:inline mt-1 sm:mt-0">{selectedToken?.address || "N/A"}</span>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 w-full sm:w-auto text-sm h-10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={submitTransaction} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm h-10">
                Submit Proposal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}