# Lockin.wtf [REVIEW@BLOWFISH.XYZ TICKET #2057]

![Lockin.wtf Logo](https://ipfs.io/ipfs/Qmc2SJQW4K7UYYVLdoKSf4cGVZbuFGTF4dZiAdRtivNkpX)

Lockin.wtf is a decentralized application (dApp) that allows you to view and manage your token holdings on the Solana blockchain.

## Features

### **🗝️ Connect and Validate Solana Wallet**

Easily connect any Solana wallet supported by [@solana/wallet-adapter](https://github.com/solana-labs/wallet-adapter), such as [Phantom](https://phantom.app/) and [Backpack](https://www.backpack.app/). The dApp auto-connects to your wallet if it has been previously approved, enhancing user convenience.

To ensure security, the dApp requests a signature to validate wallet ownership upon connection. This signature process is client-side and safe, with no blockchain interaction.

### **🔗 Retrieve Token Data**

Once your wallet is connected, the dApp fetches and displays detailed information about the tokens in your wallet. This includes:

- Fetching and parsing token accounts
- Retrieving token metadata, including name, symbol, and logo
- Calculating the USD value of your tokens using Jupiter Swap prices
- Displaying the tokens in a user-friendly interface

All actions are performed using official Solana libraries such as [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/) and the [Metaplex](https://github.com/metaplex-foundation/js) library.

### **🔌 Rate Limiting for API Calls**

To handle rate limits and ensure smooth operation, the dApp uses Bottleneck for rate limiting API calls to Solana RPC endpoints and other services.

### **🎨 Customizable UI**

The dApp uses [Tailwind CSS](https://tailwindcss.com/) and [daisyUI](https://daisyui.com/) for a flexible and rapid development experience. You can easily customize the theme by modifying the `daisy.themes` setting in `./tailwind.config.js` and setting the `data-theme` attribute in the `<html>` tag. Additionally, a theme switcher is provided for users to toggle between dark and light modes.

For feedback on on-chain actions, the dApp integrates [react-hot-toast](https://react-hot-toast.com/).

## Getting Started

1. Get an API key from [Helius](https://helius.xyz/) to fetch wallet details.
2. Add a `.env.local` file with your Helius API key:

```
HELIUS_API_KEY=<your key>
NEXT_PUBLIC_SOLANA_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=<your key>
UNKNOWN_IMAGE_URL=https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png
```

3. Run `yarn dev` to start the development server.
4. Make changes and have fun!

## Deploying

1. Run `yarn build` locally to ensure everything compiles correctly.
2. Use `https://favicon.io/favicon-converter/` to generate favicons.
3. Link your preferred server provider to your repository (e.g., Vercel for the demo).
4. Push to the `main` branch to automatically deploy a new version.

> _This project is built on the foundation of the [Create dApp Solana Next](https://github.com/thuglabs/create-dapp-solana-nextjs) template._# soltrendio
