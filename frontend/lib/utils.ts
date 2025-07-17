import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(address: string, startLength = 6, endLength = 4): string {
  if (!address) return ""
  if (address.length <= startLength + endLength) return address
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

export function formatBalance(balance: string, decimals = 4): string {
  const num = Number.parseFloat(balance)
  if (isNaN(num)) return "0.0000"
  return num.toFixed(decimals)
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}
