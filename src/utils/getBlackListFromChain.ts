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
        
        // console.log(details);
        if (!details?.meta) {
            // console.log('No meta data found for transaction, skipping...');
            return;
        }

        const preBalance = details.meta.preTokenBalances.find((balance: any) => balance.mint === searchAddress);
        const postBalance = details.meta.postTokenBalances.find((balance: any) => balance.mint === searchAddress);
        
        // console.log('Balance changes:', {
        //     preBalance: preBalance?.uiTokenAmount?.uiAmount,
        //     postBalance: postBalance?.uiTokenAmount?.uiAmount
        // });

        if (preBalance && postBalance) {
            const diff = postBalance.uiTokenAmount.uiAmount - preBalance.uiTokenAmount.uiAmount;
            // console.log(`Token difference: ${diff}`);
            
            if (diff < 0) {
                const sellerWallet = preBalance.owner;
                const soldAmount = Math.abs(diff);
                // console.log(`Detected sale: Wallet ${sellerWallet} sold ${soldAmount} tokens`);
                
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

const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 1 minute
const MAX_RETRIES = 5;

const fetchWithRetry = async <T>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES,
    delay = INITIAL_RETRY_DELAY
): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        if (error.toString().includes('429') && retries > 0) {
            // console.log(`Rate limited. Retrying after ${delay/1000}s... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(
                operation,
                retries - 1,
                Math.min(delay * 2, MAX_RETRY_DELAY)
            );
        }
        throw error;
    }
};

// Modify the fetchTransactions function
const fetchTransactions = async (pubKey: PublicKey, numTx?: number) => {
    // console.log(`Fetching transactions for ${pubKey.toString()}, limit: ${numTx || 'all'}`);
    try {
        let allTransactions = [];
        let before = undefined;
        
        while (true) {
            const options: any = { limit: 1000 };
            if (before) {
                options.before = before;
            }
            
            // Add retry logic here
            const result = await fetchWithRetry(() => 
                solanaConnection.getSignaturesForAddress(pubKey, options)
            );
            
            // console.log(`Fetched batch of ${result.length} transactions`);
            
            if (result.length === 0) {
                break;
            }
            
            allTransactions.push(...result);
            
            if (numTx && allTransactions.length >= numTx) {
                allTransactions = allTransactions.slice(0, numTx);
                break;
            }
            
            before = result[result.length - 1].signature;
            
            // Increase delay between batches to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // console.log(`Total transactions fetched: ${allTransactions.length}`);
        return allTransactions;
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
};

// Main function to fetch and process transactions
export const getBlackList = async (address: string, numTx?: number): Promise<LargeSeller[]> => {
    try {
        // console.log(`Starting getBlackList for address: ${address}`);
        const pubKey = new PublicKey(address);
        const largeSellerMap = new Map<string, LargeSeller>();

        const transactions = await fetchTransactions(pubKey, numTx);
        if (transactions.length === 0) {
            return [];
        }

        // Process in smaller chunks to avoid RPC limits
        const CHUNK_SIZE = 100;
        // console.log(`Processing ${transactions.length} transactions in chunks of ${CHUNK_SIZE}`);
        let processedCount = 0;
        
        for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
            const chunk = transactions.slice(i, i + CHUNK_SIZE);
            processedCount += chunk.length;
            // console.log(`Progress: ${processedCount}/${transactions.length} transactions (${Math.round(processedCount/transactions.length*100)}%)`);
            
            const signatures = chunk.map(tx => tx.signature);
            
            // console.log(`Fetching details for chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(transactions.length / CHUNK_SIZE)}`);
            
            // Add retry logic here
            const details = await fetchWithRetry(() => 
                solanaConnection.getParsedTransactions(signatures, { 
                    maxSupportedTransactionVersion: 0 
                })
            );

            if (!details || details.length === 0) {
                console.error('Failed to fetch transaction details for chunk');
                continue;
            }

            // console.log(`Processing ${details.length} transactions in current chunk`);
            
            const processPromises = chunk.map((transaction, index) => {
                if (!details[index]) {
                    console.log(`No details for transaction ${transaction.signature}`);
                    return Promise.resolve();
                }
                return processTransaction(transaction, details[index], largeSellerMap);
            });

            const results = await Promise.allSettled(processPromises);
            
            // Log any errors that occurred during processing
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Failed to process transaction ${chunk[index].signature}:`, result.reason);
                }
            });

            // Add delay between chunks to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // console.log(`Total unique sellers found: ${largeSellerMap.size}`);
        const largeSellers = Array.from(largeSellerMap.values())
            .filter(seller => seller.totalSold > 6000000)
            .sort((a, b) => b.totalSold - a.totalSold);

        // console.log(`Found ${largeSellers.length} large sellers after filtering`);
        return largeSellers;

    } catch (error) {
        console.error('Error during transaction fetching or processing:', error);
        throw error;
    }
};
