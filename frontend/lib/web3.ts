// lib/web3.ts
import { ethers } from "ethers"
import { CONTRACT_ADDRESSES } from "./constants"
import { COMPANY_WALLET_ABI, MULTISIG_CONTROLLER_ABI } from "./abis"
import { getTargetChainId } from "./networks" // Import target chain ID

// 1. Updated interface to include initiator
export interface TransactionDetails {
  initiator: string
  to: string
  value: bigint
  data: string
  isTokenTransfer: boolean
  tokenAddress: string
  executed: boolean
  confirmationCount: bigint
  timestamp: bigint
  timelockEnd: bigint
}

export interface FullTransaction extends TransactionDetails {
  id: bigint
  currentUserHasConfirmed: boolean
}

export interface Owner {
  address: string
  percentage: bigint
  exists: boolean
  isRemovable: boolean
  index: bigint
}

export class Web3Service {
  private signer: ethers.Signer | null = null
  private provider: ethers.BrowserProvider | null = null // Store provider

  /**
   * NEW: Connects to the user's wallet (e.g., MetaMask)
   */
  public async connect(): Promise<string> {
    if (typeof window.ethereum === "undefined") {
      throw new Error("No crypto wallet found. Please install it.")
    }

    try {
      // 1. Create provider, requesting "any" network
      const browserProvider = new ethers.BrowserProvider(window.ethereum, "any")
      
      // 2. Request accounts from user
      const accounts = await browserProvider.send("eth_requestAccounts", [])
      if (accounts.length === 0) {
        throw new Error("No accounts found.")
      }

      // 3. Get the signer
      const signer = await browserProvider.getSigner()
      
      // 4. Store provider and signer
      this.provider = browserProvider
      this.signer = signer

      // 5. Return address
      return await signer.getAddress()
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      throw new Error(error.message || "Failed to connect wallet")
    }
  }

  /**
   * NEW: Disconnects the wallet by clearing the signer
   */
  public async disconnect() {
    this.signer = null
    this.provider = null
    console.log("Web3Service signer and provider cleared.")
  }

  /**
   * NEW: Checks if a signer is available
   */
  public isConnected(): boolean {
    return this.signer !== null
  }

  /**
   * NEW: Gets the current user's address
   */
  public async getCurrentAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error("Wallet not connected")
    }
    return await this.signer.getAddress()
  }

  /**
   * NEW: Requests to switch to the target network
   */
  public async switchNetwork(): Promise<void> {
    if (!this.provider) {
      throw new Error("Wallet not connected. Cannot switch network.")
    }

    const targetChainId = getTargetChainId() // Get target chain from our networks file
    const chainIdHex = `0x${targetChainId.toString(16)}`

    try {
      // Request a switch to the target chain
      await this.provider.send("wallet_switchEthereumChain", [{ chainId: chainIdHex }])
    } catch (switchError: any) {
      // This error code (4902) indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        // You can add logic here to add the chain to MetaMask
        // e.g., await this.provider.send("wallet_addEthereumChain", [CHAIN_DETAILS_OBJECT])
        console.error("This network is not added to your wallet.")
        throw new Error("This network is not added to your wallet.")
      }
      console.error("Failed to switch network:", switchError)
      throw new Error("Failed to switch network.")
    }
  }
  
  // DELETED: setSigner(signer: ethers.Signer | null)
  // DELETED: hasSigner() (replaced by isConnected())

  // Helper to get the provider
  private getProvider(): ethers.Provider {
    // Use the stored provider
    if (!this.provider) {
      // Fallback for safety, though connect() should always set it
      if (this.signer?.provider) {
        return this.signer.provider
      }
      throw new Error("Wallet not connected or provider not available")
    }
    return this.provider
  }

  // --- All other methods (getAllTransactions, contract calls, etc.) remain unchanged ---
  // They will work correctly as they all depend on this.signer and this.getProvider()
  
  async getAllTransactions(): Promise<FullTransaction[]> {
    if (!this.signer) throw new Error("Wallet not connected")

    const contract = this.getMultiSigControllerContract()
    const userAddress = await this.signer.getAddress()

    let transactionCount: bigint
    try {
      transactionCount = await contract.getTransactionCount()
    } catch (e) {
      console.error("Failed to get transaction count", e)
      return [] // Return empty if count fails
    }

    if (transactionCount === 0n) {
      return []
    }

    const txPromises: Promise<FullTransaction | null>[] = []
    
    // Fetch the last 50 transactions (or fewer if less than 50 exist)
    const limit = 50
    const startIndex = transactionCount > BigInt(limit) ? transactionCount - BigInt(limit) : 0n

    for (let i = transactionCount - 1n; i >= startIndex; i--) {
      const txId = i
      txPromises.push(
        (async () => {
          try {
            // Use the getTransaction method you already defined
            const txDetails: TransactionDetails = await this.getTransaction(txId)
            const currentUserHasConfirmed = await this.hasConfirmed(txId, userAddress)
            
            return {
              ...txDetails,
              id: txId,
              currentUserHasConfirmed: currentUserHasConfirmed,
            }
          } catch (error) {
            console.error(`Failed to fetch details for tx ${txId}:`, error)
            return null // Handle error for a single tx
          }
        })()
      )
    }

    const results = await Promise.all(txPromises)
    
    // Filter out nulls (failed fetches) and sort descending by ID (most recent first)
    return results
      .filter((tx): tx is FullTransaction => tx !== null)
      .sort((a, b) => Number(b.id) - Number(a.id))
  }

  async validateContracts(): Promise<{ companyWallet: boolean; multiSigController: boolean }> {
    const provider = this.getProvider()
    
    const results = {
      companyWallet: false,
      multiSigController: false
    }
    
    try {
      // Check if company wallet contract exists
      if (CONTRACT_ADDRESSES.COMPANY_WALLET && ethers.isAddress(CONTRACT_ADDRESSES.COMPANY_WALLET)) {
        const code = await provider.getCode(CONTRACT_ADDRESSES.COMPANY_WALLET)
        results.companyWallet = code !== "0x"
      }
      
      // Check if multisig controller contract exists
      if (CONTRACT_ADDRESSES.MULTISIG_CONTROLLER && ethers.isAddress(CONTRACT_ADDRESSES.MULTISIG_CONTROLLER)) {
        const code = await provider.getCode(CONTRACT_ADDRESSES.MULTISIG_CONTROLLER)
        results.multiSigController = code !== "0x"
      } 
    } catch (error) {
      console.error("Error validating contracts:", error)
    }
    
    return results
  }

  async getNetworkInfo(): Promise<{ chainId: number; name: string } | null> {
    const provider = this.getProvider()
    
    try {
      const network = await provider.getNetwork()
      return {
        chainId: Number(network.chainId),
        name: network.name
      }
    } catch (error) {
      console.error("Error getting network info:", error)
      return null
    }
  }

  getCompanyWalletContract() {
    if (!this.signer) throw new Error("Wallet not connected")
    return new ethers.Contract(CONTRACT_ADDRESSES.COMPANY_WALLET, COMPANY_WALLET_ABI, this.signer)
  }

  getMultiSigControllerContract() {
    if (!this.signer) throw new Error("Wallet not connected")
    return new ethers.Contract(CONTRACT_ADDRESSES.MULTISIG_CONTROLLER, MULTISIG_CONTROLLER_ABI, this.signer)
  }

  // --- Helper to parse TransactionSubmitted event ---
  private async getTransactionIdFromReceipt(
    contract: ethers.Contract,
    receipt: ethers.TransactionReceipt
  ): Promise<bigint | undefined> {
    let transactionId: bigint | undefined
    if (receipt && receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          })
          if (parsed?.name === "TransactionSubmitted") {
            transactionId = parsed.args[0]
            break
          }
        } catch {}
      }
    }
    return transactionId
  }

  // Company Wallet Methods
  async getBalance(): Promise<string> {
    try {
      const contract = this.getCompanyWalletContract()
      const balance = await contract.getBalance()
      return ethers.formatEther(balance)
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`)
    }
  }

  async getTokenBalance(tokenAddress: string, decimals: number = 18): Promise<string> {
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error("Invalid token address")
    }
    
    try {
      const contract = this.getCompanyWalletContract()
      const balance = await contract.getTokenBalance(tokenAddress)
      return ethers.formatUnits(balance, decimals)
    } catch (error: any) {
      throw new Error(`Failed to get token balance: ${error.message}`)
    }
  }

  async getOwner(): Promise<string> {
    try {
      const contract = this.getCompanyWalletContract()
      return await contract.owner()
    } catch (error: any) {
      throw new Error(`Failed to get owner: ${error.message}`)
    }
  }

  async getController(): Promise<string> {
    try {
      const contract = this.getCompanyWalletContract()
      return await contract.controller()
    } catch (error: any) {
      throw new Error(`Failed to get controller: ${error.message}`)
    }
  }

  // MultiSig Controller Methods
  async submitTransaction(
    to: string,
    value: string,
    isTokenTransfer: boolean,
    tokenAddress: string = ethers.ZeroAddress,
    data: string = "0x",
    tokenDecimals: number = 18
  ): Promise<{ tx: ethers.ContractTransactionResponse; transactionId?: bigint }> {
    if (!ethers.isAddress(to)) {
      throw new Error("Invalid recipient address")
    }
    
    if (isTokenTransfer && !ethers.isAddress(tokenAddress)) {
      throw new Error("Invalid token address")
    }
    
    try {
      const contract = this.getMultiSigControllerContract()
      
      // Convert value appropriately based on transfer type
      let valueInWei: bigint
      if (isTokenTransfer) {
        // For token transfers, value is the token amount in smallest unit
        valueInWei = ethers.parseUnits(value, tokenDecimals)
      } else {
        // For ETH transfers, convert from ETH to wei
        valueInWei = ethers.parseEther(value)
      }

      // Submit transaction to multisig
      const tx = await contract.submitTransaction(to, valueInWei, isTokenTransfer, tokenAddress, data)
      
      // Wait for transaction receipt to get the transaction ID from events
      const receipt = await tx.wait()
      const transactionId = await this.getTransactionIdFromReceipt(contract, receipt)
      
      return { tx, transactionId }
    } catch (error: any) {
      throw new Error(`Failed to submit transaction: ${error.message}`)
    }
  }

  async confirmTransaction(transactionId: number | bigint): Promise<ethers.ContractTransactionResponse> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.confirmTransaction(transactionId)
    } catch (error: any) {
      throw new Error(`Failed to confirm transaction: ${error.message}`)
    }
  }

  async confirmTransactionsBatch(transactionIds: (number | bigint)[]): Promise<ethers.ContractTransactionResponse> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.confirmTransactionsBatch(transactionIds)
    } catch (error: any) {
      throw new Error(`Failed to confirm transactions batch: ${error.message}`)
    }
  }

  async revokeConfirmation(transactionId: number | bigint): Promise<ethers.ContractTransactionResponse> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.revokeConfirmation(transactionId)
    } catch (error: any) {
      throw new Error(`Failed to revoke confirmation: ${error.message}`)
    }
  }

  async executeTransactionManual(transactionId: number | bigint): Promise<ethers.ContractTransactionResponse> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.executeTransactionManual(transactionId)
    } catch (error: any) {
      throw new Error(`Failed to execute transaction: ${error.message}`)
    }
  }

  // 2. Updated getTransaction to parse initiator
  async getTransaction(transactionId: number | bigint): Promise<TransactionDetails> {
    try {
      const contract = this.getMultiSigControllerContract()
      const tx = await contract.getTransaction(transactionId)
      
      return {
        initiator: tx.initiator,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        isTokenTransfer: tx.isTokenTransfer,
        tokenAddress: tx.tokenAddress,
        executed: tx.executed,
        confirmationCount: tx.confirmationCount,
        timestamp: tx.timestamp,
        timelockEnd: tx.timelockEnd
      }
    } catch (error: any) {
      throw new Error(`Failed to get transaction: ${error.message}`)
    }
  }

  async getTransactionCount(): Promise<number> {
    try {
      const contract = this.getMultiSigControllerContract()
      const count = await contract.getTransactionCount()
      return Number(count)
    } catch (error: any) {
      throw new Error(`Failed to get transaction count: ${error.message}`)
    }
  }

  async isConfirmed(transactionId: number | bigint): Promise<boolean> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.isConfirmed(transactionId)
    } catch (error: any) {
      throw new Error(`Failed to check confirmation status: ${error.message}`)
    }
  }

  async hasConfirmed(transactionId: number | bigint, owner: string): Promise<boolean> {
    if (!ethers.isAddress(owner)) {
      throw new Error("Invalid owner address")
    }
    
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.hasConfirmed(transactionId, owner)
    } catch (error: any) {
      throw new Error(`Failed to check owner confirmation: ${error.message}`)
    }
  }

  async getOwners(): Promise<{ addresses: string[]; names: string[]; percentages: bigint[]; removables: boolean[] }> {
    try {
      const contract = this.getMultiSigControllerContract()
      const result = await contract.getOwners()
      
      return {
        addresses: result.addresses,
        names: result.names, // Added per ABI
        percentages: result.percentages,
        removables: result.removables
      }
    } catch (error: any) {
      throw new Error(`Failed to get owners: ${error.message}`)
    }
  }

  async getOwnerDetails(address: string): Promise<Owner> {
    if (!ethers.isAddress(address)) {
      throw new Error("Invalid owner address")
    }
    
    try {
      const contract = this.getMultiSigControllerContract()
      const owner = await contract.owners(address)
      
      return {
        address: owner.ownerAddress,
        percentage: owner.percentage,
        exists: owner.exists,
        isRemovable: owner.isRemovable,
        index: owner.index
      }
    } catch (error: any) {
      throw new Error(`Failed to get owner details: ${error.message}`)
    }
  }

  async getRequiredPercentage(): Promise<number> {
    try {
      const contract = this.getMultiSigControllerContract()
      const percentage = await contract.requiredPercentage()
      return Number(percentage)
    } catch (error: any) {
      throw new Error(`Failed to get required percentage: ${error.message}`)
    }
  }

  async getPoolPercentage(): Promise<number> {
    try {
      const contract = this.getMultiSigControllerContract()
      const percentage = await contract.getPoolPercentage()
      return Number(percentage)
    } catch (error: any) {
      throw new Error(`Failed to get pool percentage: ${error.message}`)
    }
  }

  async isPaused(): Promise<boolean> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.paused()
    } catch (error: any) {
      throw new Error(`Failed to check pause status: ${error.message}`)
    }
  }

  // --- NEW: Added view functions from ABI ---
  async getDeployer(): Promise<string> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.deployer()
    } catch (error: any) {
      throw new Error(`Failed to get deployer: ${error.message}`)
    }
  }

  async getExpiryPeriod(): Promise<bigint> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.expiryPeriod()
    } catch (error: any) {
      throw new Error(`Failed to get expiry period: ${error.message}`)
    }
  }

  async getOwnerCount(): Promise<bigint> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.getOwnerCount()
    } catch (error: any) {
      throw new Error(`Failed to get owner count: ${error.message}`)
    }
  }

  async getMinOwners(): Promise<bigint> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.minOwners()
    } catch (error: any) {
      throw new Error(`Failed to get min owners: ${error.message}`)
    }
  }

  async getTimelockPeriod(): Promise<bigint> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.timelockPeriod()
    } catch (error: any) {
      throw new Error(`Failed to get timelock period: ${error.message}`)
    }
  }
  
  async getCompanyWalletAddress(): Promise<string> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.companyWallet()
    } catch (error: any) {
      throw new Error(`Failed to get company wallet address: ${error.message}`)
    }
  }
  // --- END NEW ---

  // --- Admin methods (UPDATED to submit proposals) ---

  /**
   * Submits a proposal to add a new owner.
   */
  async submitAddOwner(
    newOwner: string,
    name: string,
    percentage: number
  ): Promise<{ tx: ethers.ContractTransactionResponse; transactionId?: bigint }> {
    if (!ethers.isAddress(newOwner)) {
      throw new Error("Invalid owner address")
    }
    
    try {
      const contract = this.getMultiSigControllerContract()
      const tx = await contract.submitAddOwner(newOwner, name, percentage)
      
      const receipt = await tx.wait()
      const transactionId = await this.getTransactionIdFromReceipt(contract, receipt)
      
      return { tx, transactionId }
    } catch (error: any) {
      throw new Error(`Failed to submit add owner proposal: ${error.message}`)
    }
  }

  /**
   * Submits a proposal to remove an owner.
   */
  async submitRemoveOwner(
    ownerToRemove: string
  ): Promise<{ tx: ethers.ContractTransactionResponse; transactionId?: bigint }> {
    if (!ethers.isAddress(ownerToRemove)) {
      throw new Error("Invalid owner address")
    }
    
    try {
      const contract = this.getMultiSigControllerContract()
      const tx = await contract.submitRemoveOwner(ownerToRemove)
      
      const receipt = await tx.wait()
      const transactionId = await this.getTransactionIdFromReceipt(contract, receipt)
      
      return { tx, transactionId }
    } catch (error: any) {
      throw new Error(`Failed to submit remove owner proposal: ${error.message}`)
    }
  }

  /**
   * Submits a proposal to change the required confirmation percentage.
   */
  async submitChangeRequiredPercentage(
    newPercentage: number
  ): Promise<{ tx: ethers.ContractTransactionResponse; transactionId?: bigint }> {
    try {
      const contract = this.getMultiSigControllerContract()
      const tx = await contract.submitChangeRequiredPercentage(newPercentage)
      
      const receipt = await tx.wait()
      const transactionId = await this.getTransactionIdFromReceipt(contract, receipt)
      
      return { tx, transactionId }
    } catch (error: any) {
      throw new Error(`Failed to submit change required percentage proposal: ${error.message}`)
    }
  }

  // --- Direct Admin methods (Pause/Unpause are still direct) ---
  async pause(): Promise<ethers.ContractTransactionResponse> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.pause()
    } catch (error: any) {
      throw new Error(`Failed to pause contract: ${error.message}`)
    }
  }

  async unpause(): Promise<ethers.ContractTransactionResponse> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.unpause()
    } catch (error: any) {
      throw new Error(`Failed to unpause contract: ${error.message}`)
    }
  }

  // 3. Added the new test function
  async callTestFunction(): Promise<ethers.ContractTransactionResponse> {
    try {
      const contract = this.getMultiSigControllerContract()
      return await contract.test()
    } catch (error: any) {
      throw new Error(`Failed to call test function: ${error.message}`)
    }
  }

  // Utility method to wait for transaction confirmation
  async waitForTransaction(txHash: string): Promise<ethers.TransactionReceipt | null> {
    const provider = this.getProvider()
    
    try {
      return await provider.waitForTransaction(txHash)
    } catch (error: any) {
      throw new Error(`Failed to wait for transaction: ${error.message}`)
    }
  }
}

export const web3Service = new Web3Service()