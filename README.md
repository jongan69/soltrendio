# SolTrendIO - Solana Wallet Analyzer & Thesis Generator

SolTrendIO is a powerful analytics tool that analyzes Solana wallets to generate investment theses, sentiment analysis, market trend projections, and automated presentation decks.

## Features

### **📊 Comprehensive Wallet Analysis**

- Connect any Solana wallet or enter a wallet address manually
- View detailed token holdings and total portfolio value
- Automatic token metadata resolution and price fetching
- Portfolio composition breakdown with percentages

### **🤖 AI-Powered Investment Thesis**

The app generates detailed investment theses based on:
- Token distribution
- Portfolio composition
- Historical holding patterns
- Market trends
- Token correlations
- Risk assessment

### **📈 Advanced Analytics**

- **Sentiment Analysis**: Evaluates generated theses across multiple dimensions:
  - Racism detection
  - Hate speech detection
  - Drug/substance references
  - Profanity levels
  - Crudity assessment
- **Google Trends Integration**: Shows search interest trends for your top tokens
- **Market Projections**: Visual charts showing potential market direction
- **Portfolio Metrics**: Detailed breakdown of holdings and value distribution

### **🎯 Automated Presentations**

- **PowerPoint Generation**: Automatically creates professional presentations including:
  - Token-specific slides with analysis
  - Portfolio overview
  - Market trend visualizations
  - Sentiment analysis charts
  - Custom emoji indicators for market sentiment
  - Branded with your portfolio data

### **🔄 Real-time Updates**

- Live price updates via Jupiter Swap
- Automatic token metadata resolution
- Real-time sentiment scoring
- Dynamic chart generation
- Instant PowerPoint creation

### **🔗 Social Integration**

- One-click Twitter sharing of thesis
- Social sentiment analysis
- Community trend tracking

## Getting Started

1. Get required API keys:
   - Helius API for Solana data
   - OpenAI API for thesis generation
   - Google Trends API access

2. Create a `.env.local` file:

```
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
- OpenAI API for thesis generation and sentiment analysis
- Google Trends API for market analysis
- PptxGenJS for PowerPoint generation
- React-Markdown for thesis formatting

## Payment Integration

The app supports two payment methods for thesis regeneration:
- SOL payments (0.001 SOL per regeneration)
- Custom token payments (1 token per regeneration)

## Deployment

1. Build the project:
```bash
yarn build
```

2. Deploy to your preferred hosting platform (Vercel recommended)

3. Set environment variables on your hosting platform:
   - OPENAI_API_KEY
   - NEXT_PUBLIC_SOLANA_RPC_ENDPOINT
   - Additional API keys as needed

## Security

- All wallet interactions are secure and non-custodial
- No private keys are ever stored or transmitted
- All API calls are rate-limited and protected
- Sentiment analysis includes content filtering

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on GitHub or contact our support team.

NOTE: Hobby accounts are limited to daily cron jobs. https://crontab.cronhub.io/