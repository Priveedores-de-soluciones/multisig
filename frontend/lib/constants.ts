// Contract addresses (MUST be replaced with your new deployed addresses on Base Sepolia)
export const CONTRACT_ADDRESSES = {
  COMPANY_WALLET: "0x0584aa5138E12275212C390E7B398fDb4B1c94B9",
  MULTISIG_CONTROLLER: "0x8704324b8BFbf8d9d9D969F700A0cb06B7B503Aa",
} as const;

// Popular tokens on Base Sepolia
export const POPULAR_TOKENS = [
  {
    name: "Ether",
    address: "0x0000000000000000000000000000000000000000", // Native token address placeholder
    symbol: "ETH",
    decimals: 18,
  },
  {
    name: "USD Coin (Testnet)",
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
    symbol: "USDC",
    decimals: 6,
  },
] as const;

// Network configurations
export const NETWORKS = {
  BASE_SEPOLIA: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
  },
  // You can add Base Mainnet here if needed
  /*
  BASE_MAINNET: {
    chainId: 8453,
    name: "Base Mainnet",
    rpcUrl: "https://mainnet.base.org",
  },
  */
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