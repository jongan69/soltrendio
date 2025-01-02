declare global {
  interface Window {
    paymentChoice: (choice: string) => void;
  }
}

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { Circles } from "react-loader-spinner";
// import { useTokenBalance } from "@utils/hooks/useTokenBalance";
import {
  DEFAULT_WALLET,
  DEFAULT_TOKEN,
  DEFAULT_TOKEN_NAME,
  DEFAULT_TOKEN_2,
  DEFAULT_TOKEN_2_NAME
} from "@utils/globals";
import { apiLimiter, fetchTokenAccounts, handleTokenData, TokenData } from "../../utils/tokenUtils";
import {
  PublicKey,
  Connection,
  Transaction,
  SystemProgram,
  PublicKeyInitData
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
  createTransferInstruction
} from '@solana/spl-token';
import ReactMarkdown from 'react-markdown';



const hasValidScores = (scores: {
  racismScore: number,
  hateSpeechScore: number,
  drugUseScore: number,
  crudityScore: number,
  profanityScore: number
}) => {
  console.log("Checking scores:", scores);
  const hasAnyScore = Object.values(scores).some(score => score > 0);
  const hasCrudityScore = scores.crudityScore > 0;
  console.log("Has any valid scores:", hasAnyScore, "Has crudity score:", hasCrudityScore);
  return hasAnyScore || hasCrudityScore;
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

      // Normalize scores to 0-1 range if they're in 0-100 range
      const normalizeScore = (score: number) => {
        if (score === undefined || score === null) return 0;
        return score > 1 ? score / 100 : score;
      };

      const scores = {
        racism: normalizeScore(parsedResponse.racism || 0),
        crudity: normalizeScore(parsedResponse.crudity || 0),
        profanity: normalizeScore(parsedResponse.profanity || 0),
        drugUse: normalizeScore(parsedResponse.drugUse || 0),
        hateSpeech: normalizeScore(parsedResponse.hateSpeech || 0)
      };

      console.log("Setting scores:", scores);

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

  const fetchFeeWalletBalance = useCallback(async () => {
    try {
      const tokenAccounts = await fetchTokenAccounts(new PublicKey(DEFAULT_WALLET));
      const tokenAccount = tokenAccounts.value.find(account =>
        account.account.data.parsed.info.mint === DEFAULT_TOKEN
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

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchFeeWalletBalance, 30000);

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
          if (!tokenAccounts?.value) {
            throw new Error("No token accounts found");
          }

          setTotalAccounts(tokenAccounts.value.length);
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

        console.log("Extracted scores:", scores);

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

  const generateThesis = async (tokens: any[]) => {
    try {
      const summarizedData = await summarizeTokenData(tokens);
      setSummary(summarizedData);
      const response = await fetch("/api/generate-thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: summarizedData }),
      });

      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      console.log("Thesis data:", data.thesis);
      // Try to extract scores from thesis first
      const extracted = extractSentimentScores(data.thesis);
      if (extracted) {
        return extracted.cleanedThesis;
      }
      
      // If extraction failed, use API
      await fetchSentimentAnalysis(data.thesis);
      return data.thesis;
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
      } else if (paymentChoice === 'token1' || paymentChoice === 'token2') {
        // Token payment
        const tokenMint = paymentChoice === 'token1' ? DEFAULT_TOKEN : DEFAULT_TOKEN_2;
        const tokenName = paymentChoice === 'token1' ? DEFAULT_TOKEN_NAME : DEFAULT_TOKEN_2_NAME;

        const tokenAccountsFromWallet = await fetchTokenAccounts(publicKey);
        const tokenAccountFromWallet = tokenAccountsFromWallet.value.find(account =>
          account.account.data.parsed.info.mint === tokenMint
        );

        const tokenAccountsToWallet = await fetchTokenAccounts(new PublicKey(DEFAULT_WALLET));
        const tokenAccountToWallet = tokenAccountsToWallet.value.find(account =>
          account.account.data.parsed.info.mint === tokenMint
        );

        if (!tokenAccountFromWallet || !tokenAccountToWallet) {
          throw new Error(`No ${tokenName} account found for payment`);
        }

        console.log("Token account found:", tokenAccountFromWallet.pubkey.toBase58(), tokenAccountToWallet.pubkey.toBase58());

        // Lockin has 9 decimals, RETARDIO has 6
        let amountInLamports = tokenMint === DEFAULT_TOKEN ? 1 * Math.pow(10, 9) : 1 * Math.pow(10, 6);

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
              DEFAULT_TOKEN_2_NAME;
          toast.error(`Failed to process ${paymentType} payment. Please ensure you have enough balance`);
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
        <div className="bg-primary border-2 border-primary rounded-lg p-6 mb-8">
          <h2 className="text-xl text-primary font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-black">
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
                <p className="text-gray-700">{DEFAULT_TOKEN_NAME} Balance</p>
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
          {(() => {
            const hasScores = hasValidScores({
              racismScore,
              hateSpeechScore,
              drugUseScore,
              crudityScore,
              profanityScore
            });

            return hasScores ? (
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
            ) : null;
          })()}

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
          {summary && thesis && <PowerpointViewer summary={summary} thesis={thesis} />}
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
      {/* Footer Stats */}
      {feeTokenBalance > 0 && (
        <div className="text-center mt-8 p-4 bg-base-200 rounded-lg">
          <p className="text-sm">
            Total {DEFAULT_TOKEN_NAME} Generated: <span className="font-bold">{feeTokenBalance.toFixed(5)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
