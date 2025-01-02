declare global {
  interface Window {
    paymentChoice: (choice: string) => void;
  }
}

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { Circles } from "react-loader-spinner";
import { useTokenBalance } from "@utils/hooks/useTokenBalance";
import {
  DEFAULT_WALLET,
  FEE_ADDRESS,
  DEFAULT_TOKEN
} from "@utils/globals";
import { apiLimiter, fetchTokenAccounts, handleTokenData, TokenData } from "../../utils/tokenUtils";
import {
  PublicKey,
  Connection,
  Transaction, 
  SystemProgram, 
  PublicKeyInitData,
  Keypair
} from "@solana/web3.js";
import SentimentCharts from "./SentimentCharts";
import GoogleTrendsProjection from "./GoogleTrendsProjection";
import axios from "axios";
import { NETWORK } from "@utils/endpoints";
import { getTokenInfo } from "../../utils/getTokenInfo";
import { isSolanaAddress } from "../../utils/isSolanaAddress";
import { handleTweetThis } from "@utils/handleTweet";
import { saveWalletToDb } from "@utils/saveWallet";
import { summarizeTokenData } from "@utils/summarizeTokenData";
import PowerpointViewer from "./PowerpointViewer";
import { 
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import ReactMarkdown from 'react-markdown';

const formatThesis = (text: string) => {
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i !== text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
};

const hasValidScores = (scores: { 
  racismScore: number, 
  hateSpeechScore: number, 
  drugUseScore: number, 
  crudityScore: number, 
  profanityScore: number 
}) => {
  return Object.values(scores).some(score => score > 0);
};

export function HomeContent() {
  const { publicKey, sendTransaction, wallet } = useWallet();
  const [signState, setSignState] = useState<string>("initial");
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const prevPublicKey = useRef<string>(publicKey?.toBase58() || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);
  const { balance } = useTokenBalance(FEE_ADDRESS);
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

  useEffect(() => {
    if (publicKey && publicKey.toBase58() !== prevPublicKey.current) {
      prevPublicKey.current = publicKey.toBase58();
      setSignState("initial");
      saveWalletToDb(publicKey.toBase58());
    }
  }, [publicKey]);

  const updateTotalValue = useCallback((usdValue: number) => {
    setTotalValue((prevValue) => prevValue + usdValue);
  }, []);

  const fetchSentimentAnalysis = async (text: string) => {
    try {
      const response = await axios.post("/api/sentiment-analysis", { text });
      
      // Ensure we're handling both string and object responses
      let parsedResponse = typeof response.data.thesis === 'string' 
        ? JSON.parse(response.data.thesis)
        : response.data.thesis;

      // Normalize scores to 0-1 range if they're in 0-100 range
      const normalizeScore = (score: number) => score > 1 ? score / 100 : score;

      setRacismScore(normalizeScore(parsedResponse.racism));
      setCrudityScore(normalizeScore(parsedResponse.crudity || 0));
      setProfanityScore(normalizeScore(parsedResponse.profanity || 0));
      setDrugUseScore(normalizeScore(parsedResponse.drugUse));
      setHateSpeechScore(normalizeScore(parsedResponse.hateSpeech));
    } catch (error) {
      console.error("Error fetching sentiment analysis:", error);
      // Set default values in case of error
      setRacismScore(0);
      setCrudityScore(0);
      setProfanityScore(0);
      setDrugUseScore(0);
      setHateSpeechScore(0);
    }
  };

  const fetchGoogleTrends = async (tokens: any) => {
    try {
      // Sort tokens by usdValue in descending order and take the top 3
      const topTokens = tokens?.sort((a: { usdValue: number }, b: { usdValue: number }) => b.usdValue - a.usdValue).slice(0, 3);

      // Process symbols and resolve addresses
      const processedSymbols = await Promise.all(topTokens.map(async (token: { symbol: any }) => {
        if (isSolanaAddress(token.symbol)) {
          const tokenInfo = await getTokenInfo(token.symbol);
          return tokenInfo?.symbol || token.symbol;
        }
        return token.symbol;
      }));

      setTopSymbols(processedSymbols);
      console.log("Looking for keywords:", processedSymbols);

      const response = await fetch('/api/trends', {
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
            console.log("Valid public key created:", pubKey.toBase58());
          } catch (e) {
            throw new Error("Invalid wallet address");
          }

          console.log("Fetching token accounts for:", pubKey.toBase58());
          const tokenAccounts = await fetchTokenAccounts(pubKey);
          console.log("Token accounts received:", tokenAccounts);

          if (!tokenAccounts?.value) {
            throw new Error("No token accounts found");
          }

          setTotalAccounts(tokenAccounts.value.length);
          console.log("Total accounts found:", tokenAccounts.value.length);

          const tokenDataPromises = tokenAccounts.value.map((tokenAccount) =>
            handleTokenData(pubKey, tokenAccount, apiLimiter).then((tokenData) => {
              updateTotalValue(tokenData.usdValue);
              return tokenData;
            })
          );

          const tokens = await Promise.all(tokenDataPromises);
          console.log("Tokens:", tokens);
          setTokens(tokens);

          // Check the balance of the specific token
          const specificTokenAccount = tokenAccounts.value.find(account =>
            account.account.data.parsed.info.mint === DEFAULT_TOKEN
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
      console.log('Full thesis:', thesis);
      
      const singleLineThesis = thesis.replace(/\n/g, ' ');
      const scoreRegex = /Racism:\s*(\d+)(\/100)?\s*Crudity:\s*(\d+)(\/100)?\s*Profanity:\s*(\d+)(\/100)?\s*Drug\/[Aa]lcohol:\s*(\d+)(\/100)?\s*Hate [Ss]peech:\s*(\d+)(\/100)?/;
      
      const matches = singleLineThesis.match(scoreRegex);
      console.log('Matches:', matches);

      if (matches) {
        // Helper function to process score based on whether it has /100
        const processScore = (score: string, hasSlash100: string | undefined) => {
          const num = Number(score);
          // If it's already in /100 format, it's already normalized
          // If it's just a number, we need to divide by 100
          return hasSlash100 ? num / 100 : num / 100;
        };

        // Extract scores and convert to numbers immediately
        const scores = {
          racism: processScore(matches[1], matches[2]),
          crudity: processScore(matches[3], matches[4]),
          profanity: processScore(matches[5], matches[6]),
          drugUse: processScore(matches[7], matches[8]),
          hateSpeech: processScore(matches[9], matches[10])
        };

        console.log('Processed scores:', scores);

        // Force state updates to be synchronous
        Promise.resolve().then(() => {
          setRacismScore(scores.racism);
          setCrudityScore(scores.crudity);
          setProfanityScore(scores.profanity);
          setDrugUseScore(scores.drugUse);
          setHateSpeechScore(scores.hateSpeech);
          
          console.log('Updated States:', scores);
        });

        return thesis.replace(/Racism:.*?Hate [Ss]peech:\s*\d+(?:\/100)?/s, '').trim();
      }

      fetchSentimentAnalysis(thesis);
      return thesis;
    } catch (error) {
      console.error("Error extracting sentiment scores:", error);
      fetchSentimentAnalysis(thesis);
      return thesis;
    }
  };

  const generateThesis = async (tokens: any[]) => {
    try {
      const summarizedData = await summarizeTokenData(tokens);
      setSummary(summarizedData);
      const response = await fetch("/api/generate-thesis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokens: summarizedData }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // Try to extract sentiment scores and clean up thesis
      const cleanedThesis = extractSentimentScores(data.thesis);

      // If we couldn't extract scores from thesis, explicitly call sentiment analysis
      if (cleanedThesis === data.thesis) {
        await fetchSentimentAnalysis(cleanedThesis);
      }

      return cleanedThesis;
    } catch (error) {
      console.error("Error generating thesis:", error);
      return "An error occurred while generating the thesis.";
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
      const paymentChoice = await new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.innerHTML = `
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-base-200 p-6 rounded-lg shadow-xl">
              <h3 class="text-lg font-bold mb-4">Choose Payment Method</h3>
              <div class="flex flex-col gap-3">
                <button class="btn btn-primary" onclick="this.closest('.fixed').remove(); window.paymentChoice('sol')">
                  Pay with SOL (0.001 SOL)
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.fixed').remove(); window.paymentChoice('token')">
                  Pay with ${DEFAULT_TOKEN} (1 Token)
                </button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        window.paymentChoice = resolve;
      });

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
      } else {
        // Token payment
        const tokenAccounts = await fetchTokenAccounts(publicKey);
        const tokenAccount = tokenAccounts.value.find(account => 
          account.account.data.parsed.info.mint === DEFAULT_TOKEN
        );

        if (!tokenAccount) {
          throw new Error("No token account found for payment");
        }

        const tokenAccountPubkey = new PublicKey(tokenAccount.pubkey);
        const destinationAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          Keypair.generate(),
          new PublicKey(DEFAULT_TOKEN),
          new PublicKey(DEFAULT_WALLET),
          false
        );

        transaction.add(
          createTransferInstruction(
            tokenAccountPubkey,
            destinationAccount.address,
            publicKey,
            1 * Math.pow(10, 9) // Assuming 9 decimals, adjust if different
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
          toast.error(`Failed to process ${paymentChoice === 'sol' ? 'SOL' : DEFAULT_TOKEN} payment. Please ensure you have enough balance`);
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
    setSubmittedAddress(manualAddress);
    await saveWalletToDb(manualAddress);
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

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl overflow-x-hidden">
      {/* Connection Status Banner - Moved to top */}
      {!publicKey && !submittedAddress && (
        <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 mb-8">
          <h2 className="text-xl text-primary font-bold text-center">
            Please connect your wallet or submit your address to begin
          </h2>
        </div>
      )}

      {/* Wallet Input Section */}
      {!publicKey && !submittedAddress && (
        <div className="bg-base-200 rounded-lg p-6 mb-8">
          <form onSubmit={handleAddressSubmit} className="w-full max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Connect Your Wallet</h2>
            <label className="block text-sm font-medium mb-2">
              Enter your Solana wallet address:
            </label>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="w-full p-2 border rounded-md mb-4 bg-base-100"
              placeholder="Solana address..."
            />
            <button type="submit" className="btn btn-primary w-full">
              Analyze Wallet
            </button>
          </form>
        </div>
      )}

      {/* Main Content */}
      {hasFetchedData ? (
        <div className="space-y-8">
          {/* Token Balance Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">Wallet Overview</h2>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <p className="text-gray-700">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
                <p className="text-gray-700">Lockin Balance</p>
                <p className="text-2xl font-bold text-gray-900">{specificTokenBalance}</p>
              </div>
            </div>
          </div>

          {/* Thesis Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Investment Thesis
              </h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto">
                <button
                  className="btn bg-gradient-to-r from-purple-500 to-pink-500 border-none text-white hover:from-purple-600 hover:to-pink-600 shadow-lg"
                  onClick={handleGenerateNewThesis}
                >
                  Generate New
                </button>
                <button
                  className="btn bg-gradient-to-r from-blue-500 to-purple-500 border-none text-white hover:from-blue-600 hover:to-purple-600 shadow-lg"
                  onClick={() => handleTweetThis(thesis)}
                >
                  Tweet
                </button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none break-words overflow-x-hidden whitespace-pre-line text-gray-900">
              <ReactMarkdown>{thesis}</ReactMarkdown>
            </div>
          </div>

          {/* Sentiment Analysis */}
          {hasValidScores({ racismScore, hateSpeechScore, drugUseScore, crudityScore, profanityScore }) && (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
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
          )}

          {/* Google Trends */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Google Trends Projection</h2>
            <div className="w-full overflow-x-hidden">
              <GoogleTrendsProjection
                trendsData={trendsData}
                dataNames={topSymbols}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="bg-base-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              Welcome to Wallet Analyzer
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

      {summary && thesis && <PowerpointViewer summary={summary} thesis={thesis} />}

      {/* Footer Stats */}
      {balance > 0 && (
        <div className="text-center mt-8 p-4 bg-base-200 rounded-lg">
          <p className="text-sm">
            Total LOCKINS Generated: <span className="font-bold">{balance.toFixed(5)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
