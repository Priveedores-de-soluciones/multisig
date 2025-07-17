import { ethers } from "ethers"
import { CONTRACT_ADDRESSES } from "./constants"
import {  COMPANY_WALLET_ABI, MULTISIG_CONTROLLER_ABI } from "./abis"
// Import the actual ABIs from your ABI file


export class Web3Service {
  private provider: ethers.BrowserProvider | null = null
  private signer: ethers.Signer | null = null

  async connect(): Promise<string> {
    if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed")
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum)
      
      // Request access to accounts if not already granted
      await this.provider.send("eth_requestAccounts", [])
      
      this.signer = await this.provider.getSigner()

      return await this.signer.getAddress()
    } catch (error: any) {
      // Reset provider and signer on error
      this.provider = null
      this.signer = null
      throw new Error(`Failed to connect wallet: ${error.message}`)
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null
    this.signer = null
  }

  // Add a method to check if the service is connected
  isConnected(): boolean {
    return this.provider !== null && this.signer !== null
  }

  // Add a method to get the current address without connecting
  async getCurrentAddress(): Promise<string | null> {
    if (!this.signer) return null
    try {
      return await this.signer.getAddress()
    } catch (error) {
      return null
    }
  }

  // Add method to check network and validate contracts
  async validateContracts(): Promise<{ companyWallet: boolean; multiSigController: boolean }> {
    if (!this.provider) throw new Error("Provider not available")
    
    const results = {
      companyWallet: false,
      multiSigController: false
    }
    
    try {
      // Check if company wallet contract exists
      if (CONTRACT_ADDRESSES.COMPANY_WALLET && ethers.isAddress(CONTRACT_ADDRESSES.COMPANY_WALLET)) {
        const code = await this.provider.getCode(CONTRACT_ADDRESSES.COMPANY_WALLET)
        results.companyWallet = code !== "0x"
      }
      
      // Check if multisig controller contract exists
      if (CONTRACT_ADDRESSES.MULTISIG_CONTROLLER && ethers.isAddress(CONTRACT_ADDRESSES.MULTISIG_CONTROLLER)) {
        const code = await this.provider.getCode(CONTRACT_ADDRESSES.MULTISIG_CONTROLLER)
        results.multiSigController = code !== "0x"
      }
    } catch (error) {
      console.error("Error validating contracts:", error)
    }
    
    return results
  }

  // Add method to get network info
  async getNetworkInfo(): Promise<{ chainId: number; name: string } | null> {
    if (!this.provider) return null
    
    try {
      const network = await this.provider.getNetwork()
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

  async getBalance(): Promise<string> {
    if (!this.provider) throw new Error("Provider not available")
    
    try {
      const contract = this.getCompanyWalletContract()
      const balance = await contract.getBalance()
      return ethers.formatEther(balance)
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`)
    }
  }

  async getTokenBalance(tokenAddress: string): Promise<string> {
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error("Invalid token address")
    }
    
    try {
      const contract = this.getCompanyWalletContract()
      const balance = await contract.getTokenBalance(tokenAddress)
      return ethers.formatUnits(balance, 18) // Adjust decimals as needed
    } catch (error: any) {
      throw new Error(`Failed to get token balance: ${error.message}`)
    }
  }

  async executeTransaction(
  to: string,
  value: string,
  isTokenTransfer: boolean,
  tokenAddress: string = ethers.ZeroAddress,
  data = "0x",
): Promise<ethers.ContractTransactionResponse> {
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
      // For token transfers, value is typically the token amount in wei/smallest unit
      valueInWei = ethers.parseUnits(value, 18) // Adjust decimals as needed for your token
    } else {
      // For ETH transfers, convert from ETH to wei
      valueInWei = ethers.parseEther(value)
    }

    // Call the contract method and return the transaction response
    const tx = await contract.executeTransaction(to, valueInWei, isTokenTransfer, tokenAddress, data)
    return tx
  } catch (error: any) {
    throw new Error(`Failed to execute transaction: ${error.message}`)
  }
}

  async receiveTokens(tokenAddress: string, amount: string): Promise<ethers.ContractTransactionResponse> {
    if (!ethers.isAddress(tokenAddress)) {
      throw new Error("Invalid token address")
    }
    
    try {
      const contract = this.getCompanyWalletContract()
      const amountInWei = ethers.parseUnits(amount, 18) // Adjust decimals as needed

      return await contract.receiveTokens(tokenAddress, amountInWei)
    } catch (error: any) {
      throw new Error(`Failed to receive tokens: ${error.message}`)
    }
  }

  async setController(newController: string): Promise<ethers.ContractTransactionResponse> {
    if (!ethers.isAddress(newController)) {
      throw new Error("Invalid controller address")
    }
    
    try {
      const contract = this.getCompanyWalletContract()
      return await contract.setController(newController)
    } catch (error: any) {
      throw new Error(`Failed to set controller: ${error.message}`)
    }
  }

  async transferOwnership(newOwner: string): Promise<ethers.ContractTransactionResponse> {
    if (!ethers.isAddress(newOwner)) {
      throw new Error("Invalid owner address")
    }
    
    try {
      const contract = this.getCompanyWalletContract()
      return await contract.transferOwnership(newOwner)
    } catch (error: any) {
      throw new Error(`Failed to transfer ownership: ${error.message}`)
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
}
export const web3Service = new Web3Service()