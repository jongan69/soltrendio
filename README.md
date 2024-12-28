# SolTrendIO - Solana Wallet Analyzer & Thesis Generator

![SolTrendIO Logo](https://ipfs.io/ipfs/Qmc2SJQW4K7UYYVLdoKSf4cGVZbuFGTF4dZiAdRtivNkpX)

SolTrendIO is a powerful analytics tool that analyzes Solana wallets to generate investment theses, sentiment analysis, and market trend projections.

## Features

### **📊 Comprehensive Wallet Analysis**

- Connect any Solana wallet or enter a wallet address manually
- View detailed token holdings and total portfolio value
- Automatic token metadata resolution and price fetching
- Support for both tokens and NFTs

### **🤖 AI-Powered Investment Thesis**

The app generates detailed investment theses based on:
- Token distribution
- Portfolio composition
- Historical holding patterns
- Market trends

### **📈 Advanced Analytics**

- **Sentiment Analysis**: Evaluates generated theses for various risk factors
- **Google Trends Integration**: Shows search interest trends for your top tokens
- **Market Projections**: Visual charts showing potential market direction

### **🔄 Real-time Updates**

- Live price updates via Jupiter Swap
- Automatic token metadata resolution
- Real-time sentiment scoring

## Getting Started

1. Get required API keys:
   - Helius API for Solana data
   - OpenAI API for thesis generation
   - Google Trends API access

2. Create a `.env.local` file:

```
HELIUS_API_KEY=<your helius key>
OPENAI_API_KEY=<your openai key>
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=<your helius key>
```

3. Install dependencies:
```bash
yarn install
```

4. Start development server:
```bash
yarn dev
```

## Development

The project uses:
- Next.js for the framework
- Solana Web3.js for blockchain interaction
- TailwindCSS & DaisyUI for styling
- Chart.js for visualizations
- OpenAI API for thesis generation
- Google Trends API for market analysis

## Deployment

1. Build the project:
```bash
yarn build
```

2. Deploy to your preferred hosting platform (Vercel recommended)

3. Set environment variables on your hosting platform

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details
