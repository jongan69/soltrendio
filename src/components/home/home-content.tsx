import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";

// Web3.js
import { useWallet } from "@solana/wallet-adapter-react";
import { createTransferInstruction } from '@solana/spl-token';
import {
  PublicKey,
  Connection,
  Transaction,
  SystemProgram,
  PublicKeyInitData
} from "@solana/web3.js";

// Globals
import {
  DEFAULT_WALLET,
  DEFAULT_TOKEN,
  DEFAULT_TOKEN_NAME,
  DEFAULT_TOKEN_2,
  DEFAULT_TOKEN_2_NAME,
  DEFAULT_TOKEN_3,
  DEFAULT_TOKEN_3_NAME
} from "@utils/globals";
import { NETWORK } from "@utils/endpoints";




// UI Components
import { toast } from "react-hot-toast";
import { Circles } from "react-loader-spinner";
import SentimentCharts from "./SentimentCharts";
import GoogleTrendsProjection from "./GoogleTrendsProjection";
import PowerpointViewer from "./PowerpointViewer";
import ReactMarkdown from 'react-markdown';
import { StatsTicker } from './StatsTicker';
import { PnLCard } from './PnLCard';

// Utils
import { apiLimiter, fetchTokenAccounts, handleTokenData, TokenData } from "@utils/tokenUtils";
import { getTokenInfo } from "@utils/getTokenInfo";
import { isSolanaAddress } from "@utils/isSolanaAddress";
import { handleTweetThis } from "@utils/handleTweet";
import { saveWalletToDb } from "@utils/saveWallet";
import { summarizeTokenData } from "@utils/summarizeTokenData";
import { hasValidScores } from "@utils/validateScore";
import { updateWalletToDb } from "@utils/updateWallet";
import { getSimilarCoins } from "@utils/getSimilarCoins";
import { normalizeScore } from "@utils/normalizeScore";
import { getPublicKeyFromSolDomain } from "@utils/getPublicKeyFromDomain";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Update the topHoldings interface
interface TopHolding {
  symbol: string;
  contractAddress: string;
  balance: number;
  usdValue: number;
  isNft: boolean;
  price?: number;
  marketCap?: number;
}

// Add this interface near other interfaces
interface CreatePortfolioResponse {
  message: string;
  id: string;
}

// Add this interface near other interfaces
interface TwitterAuthState {
  isLinked: boolean;
  username?: string;
}

const generatePortfolioName = (tokens: TokenData[]): string => {
  // Get unique tickers, remove any numbers, and split into parts
  const tickers = [...new Set(tokens.map(t => t.symbol || ''))]
    .filter(Boolean)
    .map(ticker => ticker.replace(/[0-9]/g, ''));
  
  // Split tickers into parts (2-3 chars each)
  const parts = tickers.flatMap(ticker => {
    const len = ticker.length;
    return [
      ticker.slice(0, Math.min(3, len)),
      len > 3 ? ticker.slice(-2) : ''
    ].filter(Boolean);
  });

  if (parts.length === 0) return `PUMP${Math.floor(Math.random() * 999)}`;

  // Create a random combination (max 3 parts to keep it under 12 chars)
  const numParts = Math.min(3, parts.length);
  const shuffled = parts.sort(() => Math.random() - 0.5);
  const combined = shuffled.slice(0, numParts).join('');

  // Ensure it's not too long and add random number if too short
  const name = combined.slice(0, 8);
  return name.length < 4 ? `${name}${Math.floor(Math.random() * 999)}` : name;
};

export function HomeContent() {
  const { publicKey, sendTransaction } = useWallet();
  const [signState, setSignState] = useState<string>("initial");
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const prevPublicKey = useRef<string>(publicKey?.toBase58() || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [thesis, setThesis] = useState<string>("");
  const [specificTokenBalance, setSpecificTokenBalance] = useState<number>(0);
  const [manualAddress, setManualAddress] = useState<string>("");
  const [submittedAddress, setSubmittedAddress] = useState<string>("");
  const [racismScore, setRacismScore] = useState<number>(0);
  const [hateSpeechScore, setHateSpeechScore] = useState<number>(0);
  const [drugUseScore, setDrugUseScore] = useState<number>(0);
  const [trendsData, setTrendsData] = useState([]);
  const [topSymbols, setTopSymbols] = useState<string[]>([]);
  const connection = new Connection(NETWORK);
  const [crudityScore, setCrudityScore] = useState<number>(0);
  const [profanityScore, setProfanityScore] = useState<number>(0);
  const [summary, setSummary] = useState<any>([]);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState<boolean>(false);
  const [feeTokenBalance, setFeeTokenBalance] = useState<number>(0);
  const [canGeneratePowerpoint, setCanGeneratePowerpoint] = useState<boolean>(false);
  const [originalDomain, setOriginalDomain] = useState<string>("");
  const [similarCoins, setSimilarCoins] = useState<any[]>([]);
  const [createdPortId, setCreatedPortId] = useState<string | null>(null);
  const [hasEligibleTokens, setHasEligibleTokens] = useState<boolean>(false);
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState<boolean>(false);
  const [twitterAuth, setTwitterAuth] = useState<TwitterAuthState>({
    isLinked: false
  });

  // Effect for handling Twitter auth messages
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log("Received message:", event.data);
      if (event.data.type === 'TWITTER_AUTH_SUCCESS') {
        setTwitterAuth({
          isLinked: true,
          username: event.data.screenName
        });
        
        toast.success(`Successfully linked Twitter account @${event.data.screenName}`);
        
        if (publicKey) {
          await checkTwitterStatus();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [publicKey]); // Add publicKey to dependencies

  // Effect for checking Twitter status on mount and wallet changes
  useEffect(() => {
    if (publicKey) {
      checkTwitterStatus();
    }
  }, [publicKey]);

  // Effect for wallet changes
  useEffect(() => {
    if (publicKey && publicKey.toBase58() !== prevPublicKey.current) {
      prevPublicKey.current = publicKey.toBase58();
      setSignState("initial");
      saveWalletToDb(publicKey.toBase58())
        .catch(error => console.error('Error saving wallet:', error));
    }
  }, [publicKey]);

  // Helper function for checking Twitter status
  const checkTwitterStatus = useCallback(async () => {
    if (!publicKey) return;

    try {
      const response = await fetch('/api/auth/twitter/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet: publicKey.toString()
        })
      });

      const data = await response.json();
      setTwitterAuth({
        isLinked: data.isLinked,
        username: data.username
      });
    } catch (error) {
      console.error('Error checking Twitter status:', error);
    }
  }, [publicKey]);

  const updateTotalValue = useCallback((usdValue: number) => {
    setTotalValue((prevValue) => prevValue + usdValue);
  }, []);

  const fetchSentimentAnalysis = async (text: string) => {
    try {
      const response = await axios.post("/api/analyze/sentiment-analysis", { text });

      // Handle the response data safely
      let parsedResponse = response.data.thesis;
      if (typeof parsedResponse === 'string') {
        try {
          // Remove any control characters before parsing
          parsedResponse = JSON.parse(parsedResponse.replace(/[\x00-\x1F\x7F-\x9F]/g, ''));
        } catch (parseError) {
          console.error("Error parsing sentiment response:", parseError);
          parsedResponse = {
            racism: 0,
            crudity: 0,
            profanity: 0,
            drugUse: 0,
            hateSpeech: 0
          };
        }
      }

      const scores = {
        racism: normalizeScore(parsedResponse.racism || 0),
        crudity: normalizeScore(parsedResponse.crudity || 0),
        profanity: normalizeScore(parsedResponse.profanity || 0),
        drugUse: normalizeScore(parsedResponse.drugUse || 0),
        hateSpeech: normalizeScore(parsedResponse.hateSpeech || 0)
      };

      // console.log("Setting scores:", scores);

      setRacismScore(scores.racism);
      setCrudityScore(scores.crudity);
      setProfanityScore(scores.profanity);
      setDrugUseScore(scores.drugUse);
      setHateSpeechScore(scores.hateSpeech);

      return scores;
    } catch (error) {
      console.error("Error fetching sentiment analysis:", error);
      const defaultScores = { racism: 0, crudity: 0, profanity: 0, drugUse: 0, hateSpeech: 0 };

      setRacismScore(0);
      setCrudityScore(0);
      setProfanityScore(0);
      setDrugUseScore(0);
      setHateSpeechScore(0);

      return defaultScores;
    }
  };

  const fetchGoogleTrends = async (tokens: any) => {
    if (!tokens || tokens.length === 0) return;
    try {
      // Filter out tokens where symbol is an address and sort by usdValue
      const filteredTokens = tokens?.filter((token: { symbol: string }) =>
        token.symbol && !isSolanaAddress(token.symbol)
      ).sort((a: { usdValue: number }, b: { usdValue: number }) =>
        b.usdValue - a.usdValue
      ).slice(0, 3);

      // Process symbols and resolve addresses
      const processedSymbols = await Promise.all(filteredTokens.map(async (token: { symbol: any }) => {
        if (isSolanaAddress(token.symbol)) {
          const tokenInfo = await getTokenInfo(token.symbol);
          return tokenInfo?.symbol || token.symbol;
        }
        return token.symbol;
      }));

      setTopSymbols(processedSymbols);
      // console.log("Looking for keywords:", processedSymbols);

      const response = await fetch('/api/analyze/trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: processedSymbols }),
      });

      const data = await response.json();
      setTrendsData(data?.default?.timelineData || []);
    } catch (error) {
      console.error("Error fetching Google Trends data:", error);
    }
  };

  const fetchFeeWalletBalance = useCallback(async () => {
    try {
      const tokenAccounts = await fetchTokenAccounts(new PublicKey(DEFAULT_WALLET));
      const tokenAccount = tokenAccounts.value.find(account =>
        account.account.data.parsed.info.mint === DEFAULT_TOKEN_3
      );

      if (tokenAccount) {
        const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
        setFeeTokenBalance(balance);
      }
    } catch (error) {
      console.error("Error fetching fee wallet balance:", error);
    }
  }, []);

  useEffect(() => {
    fetchFeeWalletBalance();
    // Refresh balance every 60 seconds
    const interval = setInterval(fetchFeeWalletBalance, 60000);
    return () => clearInterval(interval);
  }, [fetchFeeWalletBalance]);

  useEffect(() => {
    const sign = async (walletAddress: PublicKeyInitData) => {
      if (walletAddress && signState === "initial") {
        setLoading(true);
        setSignState("loading");
        const signToastId = toast.loading("Getting Token Data...");

        try {
          // Validate the address first
          let pubKey: PublicKey;
          try {
            pubKey = new PublicKey(walletAddress);
          } catch (e) {
            throw new Error("Invalid wallet address");
          }

          const tokenAccounts = await fetchTokenAccounts(pubKey);

          // Add immediate check for empty wallet
          if (!tokenAccounts?.value || tokenAccounts.value.length === 0) {
            // Reset all relevant states
            setSignState("initial");
            setTokens([]);
            setTotalAccounts(0);
            setTotalValue(0);
            setThesis("");
            setSpecificTokenBalance(0);
            setSubmittedAddress("");
            setManualAddress("");
            setTrendsData([]);
            setTopSymbols([]);

            toast.error("No tokens found in this wallet", { id: signToastId });
            setLoading(false);
            return;
          }

          setTotalAccounts(tokenAccounts.value.length);

          // Calculate total value separately
          let calculatedTotalValue = 0;
          const tokenDataPromises = tokenAccounts.value.map((tokenAccount) =>
            handleTokenData(pubKey, tokenAccount, apiLimiter).then((tokenData) => {
              calculatedTotalValue += tokenData.usdValue;
              updateTotalValue(tokenData.usdValue);
              return tokenData;
            })
          );

          const tokens = await Promise.all(tokenDataPromises);
          // console.log("Tokens:", tokens);
          setTokens(tokens);

          // Get top 10 holdings sorted by USD value
          const topHoldings = tokens
            .filter(token => token.symbol && !isSolanaAddress(token.symbol))
            .sort((a, b) => b.usdValue - a.usdValue)
            .slice(0, 10);

          // Fetch additional token info for each holding
          const enrichedTopHoldings = await Promise.all(
            topHoldings.map(async (token): Promise<TopHolding> => {
              let tokenInfo = null;
              if (token.mintAddress) {
                tokenInfo = await getTokenInfo(token.mintAddress);
              }

              return {
                symbol: token.symbol || '',
                contractAddress: token.mintAddress || '',
                balance: token.amount,
                usdValue: token.usdValue,
                isNft: token.isNft || false,
                price: tokenInfo?.price || 0,
                marketCap: tokenInfo?.marketCap || 0
              };
            })
          );

          // Check the balance of the specific token
          const specificTokenAccount = tokenAccounts.value.find(account =>
            account.account.data.parsed.info.mint === DEFAULT_TOKEN_3
          );
          const specificTokenAmount = specificTokenAccount
            ? specificTokenAccount.account.data.parsed.info.tokenAmount.uiAmount
            : 0;
          setSpecificTokenBalance(specificTokenAmount);

          // Generate initial thesis
          const thesis = await generateThesis(tokens);
          setThesis(thesis);

          // Fetch sentiment analysis and Google Trends data
          if (thesis) await fetchSentimentAnalysis(thesis);
          if (tokens) await fetchGoogleTrends(tokens);

          console.log("Updating wallet:", walletAddress.toString(), calculatedTotalValue, enrichedTopHoldings);
          // Use calculatedTotalValue instead of totalValue state
          await updateWalletToDb(
            walletAddress.toString(),
            calculatedTotalValue,
            enrichedTopHoldings,
            originalDomain
          ).catch(error => {
            console.error('Error updating wallet data:', error);
            // Don't throw here - we still want to show the data even if update fails
          });

          setSignState("success");
          toast.success("Token Data Retrieved", { id: signToastId });
        } catch (error) {
          setSignState("error");
          let errorMessage = "Error retrieving wallet data";

          if (error instanceof Error) {
            console.error("Detailed error:", error);

            // More specific error messages
            if (error.message.includes("Invalid wallet address")) {
              errorMessage = "Invalid wallet address. Please check the address and try again.";
            } else if (error.message.includes("No token accounts found")) {
              errorMessage = "No tokens found in this wallet.";
            } else if (error.message.includes("429")) {
              errorMessage = "Too many requests. Please try again in a few minutes.";
            } else if (error.message.includes("fetch")) {
              errorMessage = "Network error. Please check your connection and try again.";
            }
          }

          toast.error(errorMessage, { id: signToastId });
          console.error("Error in sign function:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (publicKey) {
      sign(publicKey.toBase58());
    } else if (submittedAddress) {
      sign(submittedAddress);
    }
  }, [signState, publicKey, submittedAddress, updateTotalValue]);

  const extractSentimentScores = (thesis: string) => {
    try {
      // Updated regex to be more flexible with spacing and line endings
      const inlineRegex = /Racism:\s*(\d+)\/100[\s\n]*Crudity:\s*(\d+)\/100[\s\n]*Profanity:\s*(\d+)\/100[\s\n]*Drug(?:\/Alcohol)?:\s*(\d+)\/100[\s\n]*Hate [Ss]peech:\s*(\d+)\/100/i;

      const matches = thesis.match(inlineRegex);
      if (matches) {
        const scores = {
          racism: Number(matches[1]) / 100,
          crudity: Number(matches[2]) / 100,
          profanity: Number(matches[3]) / 100,
          drugUse: Number(matches[4]) / 100,
          hateSpeech: Number(matches[5]) / 100
        };

        // console.log("Extracted scores:", scores);

        setRacismScore(scores.racism);
        setCrudityScore(scores.crudity);
        setProfanityScore(scores.profanity);
        setDrugUseScore(scores.drugUse);
        setHateSpeechScore(scores.hateSpeech);

        return {
          cleanedThesis: thesis.replace(/Racism:.*?Hate [Ss]peech:\s*\d+\/100/s, '').trim(),
          scores
        };
      }

      return null;
    } catch (error) {
      console.error("Error extracting sentiment scores:", error);
      return null;
    }
  };

  const generateThesis = async (tokens: any[], retryCount = 0): Promise<string> => {
    try {
      const summarizedData = await summarizeTokenData(tokens);
      setSummary(summarizedData);

      const response = await fetch("/api/analyze/generate-thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: summarizedData }),
      });

      if (!response.ok) {
        if (response.status === 500 && retryCount < MAX_RETRIES) {
          // Calculate delay with exponential backoff
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);

          // console.log(`Attempt ${retryCount + 1} failed, retrying in ${delay}ms...`);

          // Show retry toast
          toast.loading(
            `Thesis generation failed. Retrying... (${retryCount + 1}/${MAX_RETRIES})`,
            { duration: delay }
          );

          // Wait for the delay
          await new Promise(resolve => setTimeout(resolve, delay));

          // Recursive retry
          return generateThesis(tokens, retryCount + 1);
        }

        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const data = await response.json();
      // console.log("Thesis data:", data.thesis);

      // Try to extract scores from thesis first
      const extracted = extractSentimentScores(data.thesis);
      if (extracted) {
        return extracted.cleanedThesis;
      }

      // If extraction failed, use API
      await fetchSentimentAnalysis(data.thesis);
      return data.thesis;
    } catch (error) {
      console.error(`Error generating thesis (attempt ${retryCount + 1}):`, error);

      if (retryCount < MAX_RETRIES) {
        // If it's a non-500 error but we still want to retry
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);

        toast.loading(
          `Thesis generation failed. Retrying... (${retryCount + 1}/${MAX_RETRIES})`,
          { duration: delay }
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        return generateThesis(tokens, retryCount + 1);
      }

      // If we've exhausted all retries, show error and return fallback message
      toast.error("Failed to generate thesis after multiple attempts");
      return "An error occurred while generating the thesis. Please try again later.";
    }
  };

  const handleGenerateNewThesis = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet to regenerate thesis. Address-only viewing does not support regeneration.");
      return;
    }

    setLoading(true);
    setWaitingForConfirmation(true);

    try {
      // Let user choose payment method
      const paymentChoice = await new Promise<'sol' | 'token1' | 'token2' | 'token3' | 'cancel'>((resolve) => {
        const modal = document.createElement('div');
        modal.innerHTML = `
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-base-200 p-6 rounded-lg shadow-xl relative">
              <button 
                class="absolute top-2 right-2 text-gray-500 hover:text-gray-700" 
                onclick="this.closest('.fixed').remove(); window.paymentChoice('cancel')"
              >
                ✕
              </button>
              <h3 class="text-lg font-bold mb-4">Choose Payment Method</h3>
              <div class="flex flex-col gap-3">
                <button class="btn btn-primary" onclick="this.closest('.fixed').remove(); window.paymentChoice('sol')">
                  Pay with SOL (0.001 SOL)
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.fixed').remove(); window.paymentChoice('token1')">
                  Pay with ${DEFAULT_TOKEN_NAME} (1 ${DEFAULT_TOKEN_NAME})
                </button>
                <button class="btn btn-accent" onclick="this.closest('.fixed').remove(); window.paymentChoice('token2')">
                  Pay with ${DEFAULT_TOKEN_2_NAME} (1 ${DEFAULT_TOKEN_2_NAME})
                </button>
                <button class="btn btn-info" onclick="this.closest('.fixed').remove(); window.paymentChoice('token3')">
                  Pay with ${DEFAULT_TOKEN_3_NAME} (1 ${DEFAULT_TOKEN_3_NAME})
                </button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        window.paymentChoice = resolve;
      });

      // Add check for cancelled payment
      if (paymentChoice === 'cancel') {
        setLoading(false);
        setWaitingForConfirmation(false);
        return;
      }

      let transaction = new Transaction();

      if (paymentChoice === 'sol') {
        // SOL payment
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(DEFAULT_WALLET),
            lamports: 1000000, // 0.001 SOL
          })
        );
      } else if (['token1', 'token2', 'token3'].includes(paymentChoice)) {
        // Token payment
        const tokenConfig = {
          token1: { mint: DEFAULT_TOKEN, name: DEFAULT_TOKEN_NAME, decimals: 9 },
          token2: { mint: DEFAULT_TOKEN_2, name: DEFAULT_TOKEN_2_NAME, decimals: 6 },
          token3: { mint: DEFAULT_TOKEN_3, name: DEFAULT_TOKEN_3_NAME, decimals: 6 }
        }[paymentChoice];

        const tokenAccountsFromWallet = await fetchTokenAccounts(publicKey);
        const tokenAccountFromWallet = tokenAccountsFromWallet.value.find(account =>
          account.account.data.parsed.info.mint === tokenConfig.mint
        );

        const tokenAccountsToWallet = await fetchTokenAccounts(new PublicKey(DEFAULT_WALLET));
        const tokenAccountToWallet = tokenAccountsToWallet.value.find(account =>
          account.account.data.parsed.info.mint === tokenConfig.mint
        );

        if (!tokenAccountFromWallet || !tokenAccountToWallet) {
          throw new Error(`No ${tokenConfig.name} account found for payment`);
        }

        const amountInLamports = 1 * Math.pow(10, tokenConfig.decimals);

        transaction.add(
          createTransferInstruction(
            tokenAccountFromWallet.pubkey,
            tokenAccountToWallet.pubkey,
            publicKey,
            amountInLamports
          )
        );
      }

      let transactionConfirmed = false;

      try {
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        const signature = await sendTransaction(transaction, connection);

        const latestBlockhash = await connection.getLatestBlockhash();
        const confirmation = await connection.confirmTransaction({
          signature,
          ...latestBlockhash
        });

        if (confirmation.value.err) {
          throw new Error("Transaction failed");
        }

        transactionConfirmed = true;
        setWaitingForConfirmation(false);
        toast.success("Fee payment confirmed, generating new thesis...");
      } catch (error: any) {
        console.error("Transaction error:", error);
        if (error?.message?.includes("User rejected")) {
          toast.error("Transaction cancelled by user");
        } else {
          const paymentType = paymentChoice === 'sol' ? 'SOL' :
            paymentChoice === 'token1' ? DEFAULT_TOKEN_NAME :
              paymentChoice === 'token2' ? DEFAULT_TOKEN_2_NAME :
                DEFAULT_TOKEN_3_NAME;
          toast.error(`Failed to process ${paymentType} payment: ${error instanceof Error ? error.message : `${error}`}`);
        }
        setWaitingForConfirmation(false);
        setLoading(false);
        return;
      }

      // Only proceed if transaction was confirmed
      if (!transactionConfirmed) {
        setWaitingForConfirmation(false);
        setLoading(false);
        return;
      }

      // Generate new thesis only after successful payment
      const newThesis = await generateThesis(tokens);
      setThesis(newThesis);

      // Google Trends data fetch
      if (tokens) await fetchGoogleTrends(tokens);

      toast.success("New Thesis Generated");
    } catch (error) {
      console.error("Error generating thesis:", error);
      toast.error("Failed to generate new thesis");
      setWaitingForConfirmation(false);
    } finally {
      setLoading(false);
      setWaitingForConfirmation(false);
    }
  };

  const handleAddressSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    try {
      let addressToUse = manualAddress.trim();
      let solDomain = '';

      // Check if input is a .sol domain
      if (addressToUse.toLowerCase().endsWith('.sol')) {
        setLoading(true);
        try {
          solDomain = addressToUse; // Save original domain
          addressToUse = await getPublicKeyFromSolDomain(addressToUse, connection);
          toast.success(`Resolved domain to: ${addressToUse}`);
        } catch (error) {
          toast.error('Invalid or non-existent .sol domain');
          setLoading(false);
          return;
        }
      }

      // Validate final address
      if (!isSolanaAddress(addressToUse)) {
        toast.error('Please enter a valid Solana address or .sol domain');
        return;
      }

      await saveWalletToDb(addressToUse, solDomain); // Pass the domain name if it exists
      setSubmittedAddress(addressToUse);
      setOriginalDomain(solDomain);
    } catch (error) {
      console.error('Error saving wallet:', error);
      toast.error('Failed to save wallet address');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCanGeneratePowerpoint(specificTokenBalance >= 10);
  }, [specificTokenBalance]);

  useEffect(() => {
    const fetchSimilarCoins = async () => {
      if (tokens.length > 0) {
        try {
          const tokenData = tokens
            .filter(token => token.symbol && token.name)
            .map(token => ({
              symbol: token.symbol!,
              name: token.name!
            }));
          // console.log("Sending token data:", tokenData); // Debug log
          const similarCoinsData = await getSimilarCoins(tokenData);
          console.log("Received similar coins:", similarCoinsData); // Debug log
          setSimilarCoins(similarCoinsData);
        } catch (error) {
          console.error("Error fetching similar coins:", error);
        }
      }
    };

    fetchSimilarCoins();
  }, [tokens]);

  useEffect(() => {
    if (tokens && tokens.length > 0) {
      const pumpTokens = tokens.filter(token => 
        token.mintAddress && token.mintAddress.toLowerCase().endsWith('pump')
      );
      setHasEligibleTokens(pumpTokens.length > 0);
    } else {
      setHasEligibleTokens(false);
    }
  }, [tokens]);

  const handleTwitterAuth = async () => {
    try {
      if (!publicKey) {
        toast.error('Please connect your wallet first');
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading('Connecting to Twitter...');

      // Get OAuth URL from our API
      const response = await fetch('/api/auth/twitter/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          origin: window.location.origin
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Twitter authentication');
      }

      const { url } = await response.json();
      
      // Open Twitter auth in a popup
      const width = 600;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'Twitter Auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Check if popup was blocked
      if (!popup) {
        toast.error('Please allow popups for Twitter authentication', {
          id: loadingToast
        });
        return;
      }

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Start checking if popup closed
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          // Always check Twitter status when popup closes
          checkTwitterStatus();
        }
      }, 1000);

    } catch (error) {
      console.error('Twitter auth error:', error);
      toast.error('Failed to initiate Twitter authentication');
    }
  };

  // Loading State
  if (loading || !tokens || signState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-lg mb-4">
          {waitingForConfirmation
            ? "Waiting for transaction confirmation..."
            : `Found ${totalAccounts} Accounts, Generating Thesis...`}
        </p>
        <Circles color="#00BFFF" height={80} width={80} />
      </div>
    );
  }

  // Initial Loading State
  if ((publicKey || submittedAddress) && signState === "success" && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading wallet information...</p>
      </div>
    );
  }

  const hasFetchedData = (publicKey || submittedAddress) && signState === "success" && tokens.length > 0 && totalAccounts > 0;

  const handleCreatePortfolio = async () => {
    if (!tokens || tokens.length === 0) {
      toast.error("No tokens found to create portfolio");
      return;
    }

    setIsCreatingPortfolio(true); // Set loading state
    
    try {
      // Filter tokens that end with "pump"
      const pumpTokens = tokens.filter(token => 
        token.mintAddress && token.mintAddress.toLowerCase().endsWith('pump')
      );

      if (pumpTokens.length === 0) {
        toast.error("No eligible tokens found. Only tokens ending with 'pump' can be added.");
        return;
      }

      // Take only the first 4 tokens, sorted by USD value
      const topPumpTokens = pumpTokens
        .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
        .slice(0, 4);

      const response = await fetch('/api/port/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          createdBy: publicKey?.toBase58(),
          portfolioName: generatePortfolioName(topPumpTokens),
          mintAddresses: topPumpTokens.map(token => token.mintAddress),
          tokens: topPumpTokens
        })
      });

      const data: CreatePortfolioResponse = await response.json();

      if (!response.ok) {
        throw new Error('Failed to create portfolio');
      }

      setCreatedPortId(data.id);
      toast.success(`${data.message} (Added ${topPumpTokens.length} tokens)`);
    } catch (error) {
      console.error('Error creating portfolio:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create portfolio');
    } finally {
      setIsCreatingPortfolio(false); // Reset loading state
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-6 py-2 sm:py-8 max-w-4xl overflow-x-hidden">
      <div className="mb-4 sm:mb-8">
        <StatsTicker />
      </div>

      {/* Connection Status Banner - Updated padding */}
      {!publicKey && !submittedAddress && (
        <div className="bg-base-100 border-2 border-purple-500 rounded-lg p-4 sm:p-6 mb-4 sm:mb-8 shadow-lg">
          <h2 className="text-lg sm:text-xl font-bold text-center">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Please connect your wallet or submit your address to begin
            </span>
          </h2>
        </div>
      )}

      {/* Wallet Input Section - Updated spacing */}
      {!publicKey && !submittedAddress && (
        <div className="bg-base-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-8">
          <form onSubmit={handleAddressSubmit} className="w-full max-w-md mx-auto">
            <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-4">Connect Your Wallet</h2>
            <label className="block text-sm font-medium mb-2">
              Enter your Solana wallet address or .sol domain:
            </label>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="w-full p-2 border rounded-md mb-3 sm:mb-4 bg-base-100 text-sm"
              placeholder="Solana address or .sol domain..."
            />
            <button
              type="submit"
              className="btn btn-primary w-full text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? "Resolving..." : "Analyze Wallet"}
            </button>
          </form>
        </div>
      )}

      {/* Main Content - Updated spacing and responsiveness */}
      {hasFetchedData ? (
        <div className="space-y-4 sm:space-y-8">
          {/* Token Balance Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Wallet Overview</h2>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <p className="text-sm sm:text-base text-gray-700">Total Value</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
                <p className="text-sm sm:text-base text-gray-700">{DEFAULT_TOKEN_3_NAME} Balance</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{specificTokenBalance}</p>
              </div>
            </div>
          </div>

          {/* Thesis Section - Updated button layout */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Investment Thesis
              </h2>
              <div className="flex flex-row gap-2 w-full sm:w-auto">
                <button
                  className="btn btn-sm sm:btn-md bg-gradient-to-r from-purple-500 to-pink-500 border-none text-white hover:from-purple-600 hover:to-pink-600 shadow-lg flex-1 sm:flex-none text-xs sm:text-sm"
                  onClick={handleGenerateNewThesis}
                >
                  Generate New
                </button>
                <button
                  className="btn btn-sm sm:btn-md bg-gradient-to-r from-blue-500 to-purple-500 border-none text-white hover:from-blue-600 hover:to-purple-600 shadow-lg flex-1 sm:flex-none text-xs sm:text-sm"
                  onClick={() => handleTweetThis(thesis)}
                >
                  Tweet
                </button>
                {createdPortId ? (
                  <a
                    href={`https://port.fun/${createdPortId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm sm:btn-md bg-gradient-to-r from-purple-500 to-blue-500 border-none text-white hover:from-purple-600 hover:to-blue-600 shadow-lg flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    View Port
                  </a>
                ) : (
                  <button
                    className="btn btn-sm sm:btn-md bg-gradient-to-r from-green-500 to-blue-500 border-none text-white hover:from-green-600 hover:to-blue-600 shadow-lg flex-1 sm:flex-none text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-500 disabled:hover:to-blue-500"
                    onClick={handleCreatePortfolio}
                    disabled={!hasEligibleTokens || isCreatingPortfolio}
                    title={!hasEligibleTokens ? "No eligible tokens found. Only tokens ending with 'pump' can be added." : ""}
                  >
                    {isCreatingPortfolio ? "Creating..." : "Create Portfolio"}
                  </button>
                )}
              </div>
            </div>
            <div className="prose prose-sm sm:prose max-w-none break-words overflow-x-hidden whitespace-pre-line text-gray-900 text-sm sm:text-base">
              <ReactMarkdown>{thesis}</ReactMarkdown>
            </div>
          </div>

          {/* Similar Coins */}
          {similarCoins.length > 0 && (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Similar Newly Listed Coins</h2>
              <div className="space-y-4">
                {similarCoins.map((coin, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {coin.newCoin.name} ({coin.newCoin.symbol})
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {coin.reason}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {coin.newCoin.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {coin.link && (
                            <a
                              href={coin.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
                            >
                              View on Dexscreener
                            </a>
                          )}
                          {coin.website && (
                            <a
                              href={coin.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm bg-green-500 text-white hover:bg-green-600"
                            >
                              Visit Website
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="bg-purple-100 px-3 py-1 rounded-full mt-2 sm:mt-0">
                        <span className="text-sm font-medium text-purple-800">
                          {(coin.similarityScore * 100).toFixed(0)}% Match
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Analysis */}
          {(() => {
            const hasScores = hasValidScores({
              racismScore,
              hateSpeechScore,
              drugUseScore,
              crudityScore,
              profanityScore
            });

            return hasScores ? (
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Sentiment Analysis</h2>
                <div className="w-full overflow-x-hidden">
                  <SentimentCharts
                    racismScore={racismScore}
                    hateSpeechScore={hateSpeechScore}
                    drugUseScore={drugUseScore}
                    crudityScore={crudityScore}
                    profanityScore={profanityScore}
                  />
                </div>
              </div>
            ) : null;
          })()}

          {/* Google Trends */}
          {trendsData.length > 0 && <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Google Trends Projection</h2>
            <div className="w-full overflow-x-hidden">
              <GoogleTrendsProjection
                trendsData={trendsData}
                dataNames={topSymbols}
              />
            </div>
          </div>}

          {/* Add PnL Card here */}
          {publicKey && <PnLCard walletAddress={publicKey?.toBase58()} />}

          {summary && thesis && publicKey && (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
              {canGeneratePowerpoint ? (
                <PowerpointViewer
                  summary={summary}
                  thesis={thesis}
                  cost={10}
                  onGenerate={async () => {
                    try {
                      // Create transaction for 10 tokens
                      const transaction = new Transaction();

                      const tokenAccountsFromWallet = await fetchTokenAccounts(publicKey);
                      const tokenAccountFromWallet = tokenAccountsFromWallet.value.find(account =>
                        account.account.data.parsed.info.mint === DEFAULT_TOKEN_3
                      );

                      const tokenAccountsToWallet = await fetchTokenAccounts(new PublicKey(DEFAULT_WALLET));
                      const tokenAccountToWallet = tokenAccountsToWallet.value.find(account =>
                        account.account.data.parsed.info.mint === DEFAULT_TOKEN_3
                      );

                      if (!tokenAccountFromWallet || !tokenAccountToWallet) {
                        throw new Error(`No ${DEFAULT_TOKEN_3_NAME} account found for payment`);
                      }

                      const amountInLamports = 10 * Math.pow(10, 6); // Assuming 6 decimals

                      transaction.add(
                        createTransferInstruction(
                          tokenAccountFromWallet.pubkey,
                          tokenAccountToWallet.pubkey,
                          publicKey,
                          amountInLamports
                        )
                      );

                      const { blockhash } = await connection.getLatestBlockhash();
                      transaction.recentBlockhash = blockhash;

                      const signature = await sendTransaction(transaction, connection);

                      const confirmation = await connection.confirmTransaction({
                        signature,
                        ...(await connection.getLatestBlockhash())
                      });

                      if (confirmation.value.err) {
                        throw new Error("Transaction failed");
                      }

                      // Update the specific token balance after successful transaction
                      setSpecificTokenBalance(prev => prev - 10);

                      return true; // Allow PowerPoint generation to proceed
                    } catch (error) {
                      console.error("Payment error:", error);
                      toast.error(`Failed to process ${DEFAULT_TOKEN_3_NAME} payment: ${error instanceof Error ? error.message : `${error}`}`);
                      return false;
                    }
                  }}
                />
              ) : (
                <div className="text-center p-4">
                  <p className="text-lg font-semibold mb-2">PowerPoint Generation Locked</p>
                  <p>You need at least 10 {DEFAULT_TOKEN_3_NAME} tokens to generate a PowerPoint presentation.</p>
                  <p className="text-sm mt-2">Current balance: {specificTokenBalance} {DEFAULT_TOKEN_3_NAME}</p>
                </div>
              )}
            </div>
          )}

          {publicKey && (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Twitter Integration</h2>
                {twitterAuth.isLinked ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Linked to @{twitterAuth.username}
                    </span>
                    <svg 
                      className="w-5 h-5 text-green-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                  </div>
                ) : (
                  <button
                    onClick={handleTwitterAuth}
                    className="btn btn-sm sm:btn-md bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white border-none flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                    Link Twitter Account
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="bg-base-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              Welcome to Soltrendio 🚀
            </h2>
            <p className="text-lg">
              This app analyzes your wallet holdings to generate an investment thesis.
            </p>
          </div>

          {signState === "error" && (
            <div className="bg-error/10 border-2 border-error rounded-lg p-6">
              <h2 className="text-xl text-error font-bold">
                Connection Error
              </h2>
              <p className="mt-2">
                {publicKey
                  ? "Please disconnect and reconnect your wallet. You might need to reload the page. You might have too many tokens and we're being rate limited."
                  : submittedAddress
                    ? "Unable to fetch token data for this address. Please verify the address and try again."
                    : "Please check the wallet address and try again. Make sure it's a valid Solana address."}
              </p>
              <p className="mt-2 text-sm opacity-75">
                If the problem persists, try again in a few minutes or with a different address.
              </p>
            </div>
          )}
        </div>
      )}
      {/* Footer Stats - Updated padding */}
      {feeTokenBalance > 0 && (
        <div className="text-center mt-4 sm:mt-8 p-3 sm:p-4 bg-base-200 rounded-lg">
          <p className="text-xs sm:text-sm">
            Total {DEFAULT_TOKEN_3_NAME} Generated: <span className="font-bold">{feeTokenBalance.toFixed(2)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
