"use client"
import { WalletConnection } from "@/components/wallet-connection"
import { Dashboard } from "@/components/dashboard"
import { TransactionForm } from "@/components/transaction-form"
import { TokenManagement } from "@/components/token-management"
import { AdminSettings } from "@/components/admin-settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, Send, LayoutDashboard, Settings, List } from "lucide-react"
import { useWeb3 } from "@/hooks/use-web3" 
import { TransactionManager } from "@/components/transaction" // <-- FIXED PATH
import { NetworkSelector } from "@/components/network-selector" 

export default function MultiSigWallet() {
  const { isConnected } = useWeb3() 

  return (
    <div className="min-h-screen bg-[#171717] text-white">
      {/* Tabs component now wraps the header and main */}
      <Tabs defaultValue="dashboard" className="w-full">
        
        {/* Header */}
        <header className="border-b border-gray-800 bg-[#171717] sticky top-0 z-50">
          {/* Top part of header */}
          <div className="container mx-auto px-4 py-4 flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Wallet className="h-8 w-8 text-blue-500" />
              <h1 className="text-2xl font-bold hidden sm:block">MultiSig Wallet</h1>
            </div>
            
            {/* TabsList (desktop) */}
            {isConnected && (
              <div className="hidden lg:block mx-auto">
                <TabsList className="grid w-full grid-cols-5 bg-gray-800 border border-gray-700">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="execute">Execute</TabsTrigger>
                  <TabsTrigger value="tokens">Tokens</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>
              </div>
            )}

            {/* Wallet connection controls */}
            <div className="flex items-center space-x-2 justify-end">
              {isConnected && <NetworkSelector />}
              <WalletConnection />
            </div>
          </div>
          
          {/* TabsList (mobile/tablet) */}
          {isConnected && (
            <div className="container mx-auto px-4 pb-4 lg:hidden">
                <TabsList className="grid w-full grid-cols-5 bg-gray-800 border border-gray-700">
                  <TabsTrigger value="dashboard"><LayoutDashboard className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="execute"><Send className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="tokens"><Wallet className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="admin"><Settings className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="transactions"><List className="h-4 w-4" /></TabsTrigger>
                </TabsList>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {!isConnected ? (
            <div className="text-center py-20">
              <Wallet className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
              <p className="text-gray-400">Please connect your wallet to interact with the MultiSig contracts</p>
            </div>
          ) : (
            <>
              <TabsContent value="dashboard" className="mt-6"><Dashboard /></TabsContent>
              <TabsContent value="execute" className="mt-6"><TransactionForm /></TabsContent>
              <TabsContent value="tokens" className="mt-6"><TokenManagement /></TabsContent>
              <TabsContent value="admin" className="mt-6"><AdminSettings /></TabsContent>
              <TabsContent value="transactions" className="mt-6"><TransactionManager /></TabsContent>
            </>
          )}
        </main>
      </Tabs> 

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#171717] mt-20">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400">
          <p>&copy; 2025 MultiSig Wallet. Built with security in mind.</p>
        </div>
      </footer>
    </div>
  )
}