import { Connection, PublicKey } from "@solana/web3.js";
import { DEFAULT_TOKEN_3 } from "./globals";

// Configuration
const searchAddress = DEFAULT_TOKEN_3;
const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
const solanaConnection = new Connection(endpoint);

// Track large sellers
interface LargeSeller {
    wallet: string;
    totalSold: number;
    lastSaleTimestamp: number;
}

// Process a single transaction
const processTransaction = async (transaction: any, details: any, largeSellerMap: Map<string, LargeSeller>) => {
    try {
        // console.log(`Processing transaction: ${transaction.signature}`);
        
        console.log(details);
        if (!details?.meta) {
            // console.log('No meta data found for transaction, skipping...');
            return;
        }

        const preBalance = details.meta.preTokenBalances.find((balance: any) => balance.mint === searchAddress);
        const postBalance = details.meta.postTokenBalances.find((balance: any) => balance.mint === searchAddress);
        
        console.log('Balance changes:', {
            preBalance: preBalance?.uiTokenAmount?.uiAmount,
            postBalance: postBalance?.uiTokenAmount?.uiAmount
        });

        if (preBalance && postBalance) {
            const diff = postBalance.uiTokenAmount.uiAmount - preBalance.uiTokenAmount.uiAmount;
            console.log(`Token difference: ${diff}`);
            
            if (diff < 0) {
                const sellerWallet = preBalance.owner;
                const soldAmount = Math.abs(diff);
                console.log(`Detected sale: Wallet ${sellerWallet} sold ${soldAmount} tokens`);
                
                const existingSeller = largeSellerMap.get(sellerWallet) || {
                    wallet: sellerWallet,
                    totalSold: 0,
                    lastSaleTimestamp: transaction.blockTime
                };
                
                existingSeller.totalSold += soldAmount;
                existingSeller.lastSaleTimestamp = Math.max(existingSeller.lastSaleTimestamp, transaction.blockTime);
                
                // console.log(`Updated seller stats:`, existingSeller);
                largeSellerMap.set(sellerWallet, existingSeller);
            }
        }
    } catch (error) {
        console.error(`Error processing transaction ${transaction.signature}:`, error);
    }
};

const fetchTransactions = async (pubKey: PublicKey, numTx?: number) => {
    console.log(`Fetching transactions for ${pubKey.toString()}, limit: ${numTx || 'none'}`);
    try {
        const result = numTx 
            ? await solanaConnection.getSignaturesForAddress(pubKey, { limit: numTx })
            : await solanaConnection.getSignaturesForAddress(pubKey);
        console.log(`Fetched ${result.length} transactions`);
        
        if (result.length === 0) {
            console.log('No transactions found');
            return [];
        }
        
        return result;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
};

// Main function to fetch and process transactions
export const getBlackList = async (address: string, numTx?: number): Promise<LargeSeller[]> => {
    try {
        console.log(`Starting getBlackList for address: ${address}`);
        const pubKey = new PublicKey(address);
        const largeSellerMap = new Map<string, LargeSeller>();

        const transactions = await fetchTransactions(pubKey, numTx);
        if (transactions.length === 0) {
            return [];
        }

        // Process in smaller chunks to avoid RPC limits
        const CHUNK_SIZE = 100;
        console.log(`Processing ${transactions.length} transactions in chunks of ${CHUNK_SIZE}`);
        
        for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
            const chunk = transactions.slice(i, i + CHUNK_SIZE);
            const signatures = chunk.map(tx => tx.signature);
            
            console.log(`Fetching details for chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(transactions.length / CHUNK_SIZE)}`);
            const details = await solanaConnection.getParsedTransactions(signatures, { 
                maxSupportedTransactionVersion: 0 
            });

            if (!details || details.length === 0) {
                console.error('Failed to fetch transaction details for chunk');
                continue;
            }

            console.log(`Processing ${details.length} transactions in current chunk`);
            
            await Promise.all(
                chunk.map((transaction, index) => {
                    if (!details[index]) {
                        console.log(`No details for transaction ${transaction.signature}`);
                        return Promise.resolve();
                    }
                    return processTransaction(transaction, details[index], largeSellerMap);
                })
            );
        }

        console.log(`Total unique sellers found: ${largeSellerMap.size}`);
        const largeSellers = Array.from(largeSellerMap.values())
            .filter(seller => seller.totalSold > 6000000)
            .sort((a, b) => b.totalSold - a.totalSold);

        console.log(`Found ${largeSellers.length} large sellers after filtering`);
        return largeSellers;

    } catch (error) {
        console.error('Error during transaction fetching or processing:', error);
        throw error;
    }
};
