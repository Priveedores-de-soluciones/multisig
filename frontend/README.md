# MultiSig Wallet Frontend

A modern, secure, and user-friendly frontend interface for interacting with MultiSig wallet smart contracts. Built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Wallet Connection**: Seamless MetaMask integration
- **Dashboard**: Real-time balance tracking and contract information
- **Transaction Execution**: Send ETH and ERC-20 tokens
- **Token Management**: Receive and manage various tokens
- **Admin Controls**: Owner-only functions for controller and ownership management
- **Transaction History**: Complete audit trail with filtering
- **Responsive Design**: Mobile-first approach with dark theme
- **Security**: Confirmation dialogs and access controls

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom dark theme
- **UI Components**: Radix UI primitives with shadcn/ui
- **Web3**: Ethers.js v6
- **Icons**: Lucide React

## 📁 Project Structure

\`\`\`
multisig-wallet-frontend/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   └── ... (other UI components)
│   ├── admin-settings.tsx
│   ├── dashboard.tsx
│   ├── token-management.tsx
│   ├── transaction-form.tsx
│   ├── transaction-history.tsx
│   └── wallet-connection.tsx
├── hooks/
│   ├── use-toast.ts
│   └── use-web3.ts
├── lib/
│   ├── constants.ts
│   ├── utils.ts
│   └── web3.ts
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
\`\`\`

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MetaMask browser extension
- Ethereum testnet ETH (for testing)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd multisig-wallet-frontend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   \`\`\`env
   NEXT_PUBLIC_COMPANY_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b8D4C9db96590c6C89
   NEXT_PUBLIC_MULTISIG_CONTROLLER_ADDRESS=0x8ba1f109551bD432803012645Hac136c22C501e
   NEXT_PUBLIC_INFURA_KEY=your_infura_project_id
   \`\`\`

4. **Update contract addresses and ABIs**
   - Edit `lib/constants.ts` with your deployed contract addresses
   - Update `lib/web3.ts` with your actual contract ABIs

5. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Contract Setup

1. **Update Contract Addresses**
   \`\`\`typescript
   // lib/constants.ts
   export const CONTRACT_ADDRESSES = {
     COMPANY_WALLET: "YOUR_COMPANY_WALLET_ADDRESS",
     MULTISIG_CONTROLLER: "YOUR_MULTISIG_CONTROLLER_ADDRESS",
   }
   \`\`\`

2. **Update Contract ABIs**
   Replace the placeholder ABIs in `lib/web3.ts` with your actual contract ABIs.

### Network Configuration

The app supports multiple networks. Update `lib/constants.ts` to configure:

\`\`\`typescript
export const NETWORKS = {
  MAINNET: {
    chainId: "0x1",
    name: "Ethereum Mainnet",
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
  },
  SEPOLIA: {
    chainId: "0xaa36a7",
    name: "Sepolia Testnet", 
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
  },
}
\`\`\`

## 🎨 Customization

### Theme Colors

The app uses `#171717` as the primary color. To customize:

1. **Update Tailwind Config**
   \`\`\`typescript
   // tailwind.config.ts
   theme: {
     extend: {
       colors: {
         primary: {
           DEFAULT: "#171717", // Your custom color
         },
       },
     },
   }
   \`\`\`

2. **Update CSS Variables**
   \`\`\`css
   /* app/globals.css */
   :root {
     --primary: 0 0% 9%; /* Your custom HSL values */
   }
   \`\`\`

### Adding New Features

1. **Create new components** in `components/`
2. **Add new hooks** in `hooks/`
3. **Update navigation** in `app/page.tsx`
4. **Add new utilities** in `lib/`

## 📱 Usage

### Connecting Wallet

1. Click "Connect Wallet" button
2. Approve MetaMask connection
3. Ensure you're on the correct network

### Executing Transactions

1. Navigate to "Execute" tab
2. Fill in recipient address and amount
3. Choose ETH or token transfer
4. Confirm transaction in MetaMask

### Managing Tokens

1. Go to "Tokens" tab
2. Enter token contract address and amount
3. Click "Receive Tokens"

### Admin Functions (Owner Only)

1. Access "Admin" tab
2. Set new controller or transfer ownership
3. Confirm critical actions in dialog

## 🔒 Security Considerations

- Always verify contract addresses before deployment
- Use testnet for initial testing
- Implement proper access controls
- Validate all user inputs
- Use confirmation dialogs for critical actions
- Keep private keys secure

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   \`\`\`bash
   npm i -g vercel
   vercel
   \`\`\`

2. **Set environment variables** in Vercel dashboard

3. **Deploy**
   \`\`\`bash
   vercel --prod
   \`\`\`

### Other Platforms

- **Netlify**: Connect GitHub repo and deploy
- **AWS Amplify**: Use the Amplify console
- **Docker**: Use the included Dockerfile

## 🧪 Testing

\`\`\`bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Check the [Issues](https://github.com/your-repo/issues) page
- Read the [Documentation](https://docs.your-project.com)
- Join our [Discord](https://discord.gg/your-server)

## 🔄 Updates

- v1.0.0 - Initial release
- v1.1.0 - Added token management
- v1.2.0 - Enhanced security features

---

Built with ❤️ by the MultiSig Team
