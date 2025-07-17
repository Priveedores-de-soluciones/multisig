# MultiSig Wallet Frontend Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- MetaMask browser extension
- Git

### Installation Steps

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repository-url>
   cd multisig-wallet-frontend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure environment**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Edit `.env.local` with your values:
   \`\`\`env
   NEXT_PUBLIC_COMPANY_WALLET_ADDRESS=your_contract_address
   NEXT_PUBLIC_MULTISIG_CONTROLLER_ADDRESS=your_controller_address
   NEXT_PUBLIC_INFURA_KEY=your_infura_key
   \`\`\`

4. **Update contract configuration**
   
   Edit `lib/constants.ts`:
   \`\`\`typescript
   export const CONTRACT_ADDRESSES = {
     COMPANY_WALLET: "YOUR_DEPLOYED_CONTRACT_ADDRESS",
     MULTISIG_CONTROLLER: "YOUR_CONTROLLER_ADDRESS",
   }
   \`\`\`

5. **Update contract ABIs**
   
   Edit `lib/web3.ts` and replace the placeholder ABIs with your actual contract ABIs.

6. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Troubleshooting

### Common Issues

1. **"Cannot find module 'autoprefixer'"**
   \`\`\`bash
   npm install autoprefixer postcss tailwindcss --save-dev
   \`\`\`

2. **"Unexpected token ';'"**
   - Check for syntax errors in TypeScript files
   - Ensure all imports are properly formatted

3. **MetaMask connection issues**
   - Ensure MetaMask is installed and unlocked
   - Check that you're on the correct network
   - Clear browser cache if needed

4. **Contract interaction errors**
   - Verify contract addresses are correct
   - Ensure ABIs match your deployed contracts
   - Check that you have sufficient gas

### Build Issues

If you encounter build errors:

1. **Clear Next.js cache**
   \`\`\`bash
   rm -rf .next
   npm run dev
   \`\`\`

2. **Reinstall dependencies**
   \`\`\`bash
   rm -rf node_modules package-lock.json
   npm install
   \`\`\`

3. **Check TypeScript errors**
   \`\`\`bash
   npm run type-check
   \`\`\`

## 📱 Usage

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **View Dashboard**: See your wallet balances and contract information
3. **Execute Transactions**: Send ETH or tokens using the Execute tab
4. **Manage Tokens**: Receive tokens using the Tokens tab
5. **Admin Functions**: Use Admin tab if you're the wallet owner
6. **View History**: Check transaction history in the History tab

## 🚀 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   \`\`\`bash
   npm i -g vercel
   \`\`\`

2. **Deploy**
   \`\`\`bash
   vercel
   \`\`\`

3. **Set environment variables** in Vercel dashboard

### Other Platforms

- **Netlify**: Connect GitHub repo and set build command to `npm run build`
- **AWS Amplify**: Use the Amplify console
- **Docker**: Use the provided Dockerfile

## 🔒 Security Notes

- Never commit private keys or sensitive data
- Always verify contract addresses before deployment
- Test thoroughly on testnet before mainnet
- Use confirmation dialogs for critical actions
- Keep dependencies updated

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review the console for error messages
3. Ensure all prerequisites are met
4. Verify contract addresses and ABIs are correct

## 🎯 Next Steps

After successful setup:
1. Deploy your smart contracts to testnet
2. Update contract addresses in the frontend
3. Test all functionality thoroughly
4. Deploy to mainnet when ready
