"use client"
import { WalletConnection } from "@/components/wallet-connection"
import { Dashboard } from "@/components/dashboard"
import { TransactionForm } from "@/components/transaction-form"
import { TokenManagement } from "@/components/token-management"
import { AdminSettings } from "@/components/admin-settings"
import { TransactionHistory } from "@/components/transaction-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, Send, Coins, Settings, History } from "lucide-react"
import { useWeb3 } from "@/hooks/use-web3"

export default function MultiSigWallet() {
  const { isConnected } = useWeb3()

  return (
    <div className="min-h-screen bg-[#171717] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#171717] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold">MultiSig Wallet</h1>
          </div>
          <WalletConnection />
        </div>
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
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-gray-800 border border-gray-700">
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="execute" className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Execute</span>
              </TabsTrigger>
              <TabsTrigger value="tokens" className="flex items-center space-x-2">
                <Coins className="h-4 w-4" />
                <span className="hidden sm:inline">Tokens</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center space-x-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <Dashboard />
            </TabsContent>

            <TabsContent value="execute" className="mt-6">
              <TransactionForm />
            </TabsContent>

            <TabsContent value="tokens" className="mt-6">
              <TokenManagement />
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <AdminSettings />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <TransactionHistory />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#171717] mt-20">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400">
          <p>&copy; 2024 MultiSig Wallet. Built with security in mind.</p>
        </div>
      </footer>
    </div>
  )
}
