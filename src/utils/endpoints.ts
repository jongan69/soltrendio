import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

export const SOLANA_MAIN = clusterApiUrl(WalletAdapterNetwork.Mainnet);
export const SOLANA_TEST = clusterApiUrl(WalletAdapterNetwork.Testnet);
export const SOLANA_DEV = clusterApiUrl(WalletAdapterNetwork.Devnet);
export const GENESYSGO = "https://ssc-dao.genesysgo.net";
export const METAPLEX = "https://api.metaplex.solana.com";
export const SERUM = "https://solana-api.projectserum.com";
export const HELIUS = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT;
export const DEXSCREENER = "https://api.dexscreener.com";
export const JUPITER = "https://api.jup.ag";

export const JUPITER_QUOTE = "https://quote-api.jup.ag/v6";

export const BLOCKENGINE = `mainnet.block-engine.jito.wtf`

// You can use any of the other enpoints here
export const NETWORK = HELIUS || SOLANA_MAIN;
