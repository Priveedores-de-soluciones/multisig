#!/bin/bash

echo "🚀 Setting up MultiSig Wallet Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp .env.example .env.local
    echo "⚠️  Please update .env.local with your contract addresses and API keys"
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your contract addresses"
echo "2. Update lib/constants.ts with your deployed contract addresses"
echo "3. Update lib/web3.ts with your actual contract ABIs"
echo "4. Run 'npm run dev' to start the development server"
echo ""
echo "Happy coding! 🚀"
