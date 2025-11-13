// lib/constants.ts - COMPLETE UPDATED FILE
import { ethers } from "ethers";

// --- Contract Address Configuration ---

// 1. Define the interface for a contract set
export interface ContractAddresses {
  COMPANY_WALLET: string;
  MULTISIG_CONTROLLER: string;
}

// 2. Map of Chain ID to Contract Addresses (Using your deterministic addresses)
export const CHAIN_CONTRACT_ADDRESSES: { [chainId: number]: ContractAddresses } = {
  // Celo Sepolia
  11142220: {
    COMPANY_WALLET: "0x4Be7A1AaeAb3e5ef6614965A6b691FC6f2899372",
    MULTISIG_CONTROLLER: "0xDDAa50DE37178C6AFc7c98a7923FE93518BE223f",
  },
  // Lisk Sepolia (Chain ID 4202)
  4202: {
    COMPANY_WALLET: "0x4Be7A1AaeAb3e5ef6614965A6b691FC6f2899372",
    MULTISIG_CONTROLLER: "0xDDAa50DE37178C6AFc7c98a7923FE93518BE223f",
  },
  // Base Sepolia (Chain ID 84532)
  84532: {
    COMPANY_WALLET: "0x4Be7A1AaeAb3e5ef6614965A6b691FC6f2899372",
    MULTISIG_CONTROLLER: "0x8704324b8BFbf8d9d9D969F700A0cb06B7B503Aa",
  },
  // Arbitrum Sepolia (Chain ID 421614)
  421614: {
    COMPANY_WALLET: "0x4Be7A1AaeAb3e5ef6614965A6b691FC6f2899372",
    MULTISIG_CONTROLLER: "0xDDAa50DE37178C6AFc7c98a7923FE93518BE223f",
  },
} as const;


// --- Token Configuration (Chain-Specific) ---

// 3. Define the interface for a token
export interface Token {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
}

// 4. Map of Chain ID to an array of popular tokens on that chain
export const CHAIN_POPULAR_TOKENS: { [chainId: number]: readonly Token[] } = {
  // Base Sepolia (Chain ID 84532)
  84532: [
    {
      name: "Ether",
      address: ethers.ZeroAddress, // Native token
      symbol: "ETH",
      decimals: 18,
    },
    {
      name: "USD Coin",
      address: "0xd7e9C75C6C05FdE929cAc19bb887892de78819B7", // Example Base Sepolia USDC
      symbol: "USDC",
      decimals: 6,
    },
    {
      name: "USD Tether",
      address: "0xd7e9C75C6C05FdE929cAc19bb887892de78819B7", // Example Base Sepolia USDC
      symbol: "USDC",
      decimals: 6,
    },
  ],

  // Arbitrum Sepolia (Chain ID 421614)
  421614: [
    {
      name: "Ether",
      address: ethers.ZeroAddress, // Native token
      symbol: "ETH",
      decimals: 18,
    },
    {
      name: "USD Coin ",
      address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Example Arbitrum Sepolia USDC
      symbol: "USDC",
      decimals: 6,
    }, 
    {
      name: "USD Tether ",
      address: "0xf3118a17863996B9F2A073c9A66Faaa664355cf8", // Example Arbitrum Sepolia USDC
      symbol: "USDT",
      decimals: 6,
    }, 
  ],

  // Celo Sepolia (Chain ID 11142220) - **Celo is the native token**
  11142220: [
    {
      name: "Celo",
      address: ethers.ZeroAddress, // Native token
      symbol: "CELO",
      decimals: 18,
    },
    // Placeholder for a stablecoin on Celo Sepolia
    {
      name: "Celo Dollar ",
      address: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b", // Placeholder address
      symbol: "cUSD",
      decimals: 18,
    },
     {
      name: "Tether USD ",
      address: "0xf74B14ecbAdC9fBb283Fb3c8ae11E186856eae6f", // Placeholder address
      symbol: "USDT",
      decimals: 18,
    },
  ],

  // Lisk Sepolia (Chain ID 4202)
  4202: [
    {
      name: "Ether",
      address: ethers.ZeroAddress, // Native token
      symbol: "ETH",
      decimals: 18,
    },
    {
      name: "Lisk",
      address: "0x8a21CF9Ba08Ae709D64Cb25AfAA951183EC9FF6D", // Placeholder address
      symbol: "LSK",
      decimals: 18,
    },
     {
      name: "Tether USD ",
      address: "0x2728DD8B45B788e26d12B13Db5A244e5403e7eda", // Placeholder address
      symbol: "USDT",
      decimals: 18,
    },
  ],
} as const;


// Export a default/fallback state (e.g., UI initialization). 
// Components MUST now use web3Service.getPopularTokens() instead.
export const POPULAR_TOKENS = CHAIN_POPULAR_TOKENS[84532]; 

// Export a fallback for components that expect the old structure
export const CONTRACT_ADDRESSES = {
  COMPANY_WALLET: CHAIN_CONTRACT_ADDRESSES[84532].COMPANY_WALLET, 
  MULTISIG_CONTROLLER: CHAIN_CONTRACT_ADDRESSES[84532].MULTISIG_CONTROLLER,
} as const;


// --- Other Configuration (Simplified/Cleaned up) ---

// Network configurations (These are mainly for reference; lib/networks.ts is the source of truth)
export const NETWORKS = {
  BASE_SEPOLIA: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
  },
} as const;

// Transaction status
export const TRANSACTION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  EXECUTED: "executed",
  FAILED: "failed",
} as const;

// Default configuration
export const DEFAULT_CONFIG = {
  DEFAULT_GAS_LIMIT: 300000,
  CONFIRMATION_BLOCKS: 2,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
} as const;
















