import React, { useEffect, useState, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { Circles } from "react-loader-spinner";
import { useTokenBalance } from "@utils/hooks/useTokenBalance";
import {
  // DEFAULT_WALLET,
  FEE_ADDRESS,
  DEFAULT_TOKEN
} from "@utils/globals";
import { apiLimiter, fetchTokenAccounts, handleTokenData, TokenData } from "../../utils/tokenUtils";
import {
  PublicKey,
  // Connection,
  // Transaction, 
  // SystemProgram, 
  PublicKeyInitData
} from "@solana/web3.js";
import SentimentCharts from "./SentimentCharts";
import GoogleTrendsProjection from "./GoogleTrendsProjection";
import axios from "axios";
// import { NETWORK } from "@utils/endpoints";
import { getTokenInfo } from "../../utils/getTokenInfo";
import { isSolanaAddress } from "../../utils/isSolanaAddress";
import { handleTweetThis } from "@utils/handleTweet";
import { saveWalletToDb } from "@utils/saveWallet";
import { summarizeTokenData } from "@utils/summarizeTokenData";

export function HomeContent() {
  const { publicKey, sendTransaction } = useWallet();
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
  // const connection = new Connection(NETWORK);
  const [crudityScore, setCrudityScore] = useState<number>(0);
  const [profanityScore, setProfanityScore] = useState<number>(0);

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
      let parsedResponse = JSON.parse(response.data.thesis);
      setRacismScore(parsedResponse.racism);
      setCrudityScore(parsedResponse.crudity || 0);
      setProfanityScore(parsedResponse.profanity || 0);
      setDrugUseScore(parsedResponse.drugUse);
      setHateSpeechScore(parsedResponse.hateSpeech);
    } catch (error) {
      console.log("Error fetching sentiment analysis:", error);
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
      setTrendsData(data.default.timelineData);
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

      const scoreRegex = /Racism:\s*(\d+)\/100.*?Crudity:\s*(\d+)\/100.*?Profanity:\s*(\d+)\/100.*?Drug\/Alcohol:\s*(\d+)\/100.*?Hate [Ss]peech:\s*(\d+)\/100/s;
      const matches = thesis.match(scoreRegex);
      console.log('Matches:', matches);

      if (matches) {
        // Extract scores and convert to numbers immediately
        const scores = {
          racism: Number(matches[1]) / 100,
          crudity: Number(matches[2]) / 100,
          profanity: Number(matches[3]) / 100,
          drugUse: Number(matches[4]) / 100,
          hateSpeech: Number(matches[5]) / 100
        };

        console.log('Processed scores:', scores);

        // Update all sentiment scores
        setRacismScore(scores.racism);
        setCrudityScore(scores.crudity);
        setProfanityScore(scores.profanity);
        setDrugUseScore(scores.drugUse);
        setHateSpeechScore(scores.hateSpeech);

        // Return thesis without the scores section
        return thesis.replace(/Racism:.*?Hate [Ss]peech:\s*\d+\/100/s, '').trim();
      }
      return thesis;
    } catch (error) {
      console.error("Error extracting sentiment scores:", error);
      return thesis;
    }
  };

  const generateThesis = async (tokens: any[]) => {
    try {
      const summarizedData = await summarizeTokenData(tokens);

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

      // If we couldn't extract scores, use the sentiment analysis endpoint
      if (cleanedThesis === data.thesis) {
        await fetchSentimentAnalysis(data.thesis);
      }

      return cleanedThesis;
    } catch (error) {
      console.error("Error generating thesis:", error);
      return "An error occurred while generating the thesis.";
    }
  };

  const handleGenerateNewThesis = async () => {
    // Logic for generating a new thesis for a small fee
    // if (specificTokenBalance === 0 && publicKey) {
    // Charge a small Solana transaction if the specific token balance is 0
    // try {
    // const transaction = new Transaction().add(
    //   SystemProgram.transfer({
    //     fromPubkey: publicKey,
    //     toPubkey: new PublicKey(DEFAULT_WALLET),
    //     lamports: 1000, // Small fee in lamports
    //   })
    // );

    // const signature = await sendTransaction(transaction, connection);
    // await connection.confirmTransaction({
    //   signature,
    //   blockhash: transaction.recentBlockhash!,
    //   lastValidBlockHeight: transaction.lastValidBlockHeight!
    // });
    //     toast.success("Fee transaction successful, generating new thesis...");
    //   } catch (error) {
    //     toast.error("Transaction failed, please try again");
    //     console.error(error);
    //     return;
    //   }
    // }

    setLoading(true);
    try {
      const newThesis = await generateThesis(tokens);
      setThesis(newThesis);

      // Google Trends data fetch
      if (tokens) await fetchGoogleTrends(tokens);

      toast.success("New Thesis Generated");
    } catch (error) {
      toast.error("Error generating new thesis");
      console.error(error);
    } finally {
      setLoading(false);
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
        <p className="text-lg mb-4">Found {totalAccounts} Accounts, Generating Thesis...</p>
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
          <div className="bg-base-200 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold">Wallet Overview</h2>
              <div className="text-left sm:text-right w-full sm:w-auto">
                <p className="text-sm">Total Value</p>
                <p className="text-lg font-bold">${totalValue.toFixed(2)}</p>
                <p className="text-sm">Lockin Balance</p>
                <p className="text-lg font-bold">{specificTokenBalance}</p>
              </div>
            </div>
          </div>

          {/* Thesis Section */}
          <div className="bg-base-200 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-xl font-bold">Investment Thesis</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto">
                <button
                  className="btn btn-primary btn-sm w-full sm:w-auto"
                  onClick={handleGenerateNewThesis}
                >
                  Generate New
                </button>
                <button
                  className="btn btn-secondary btn-sm w-full sm:w-auto"
                  onClick={() => handleTweetThis(thesis)}
                >
                  Tweet
                </button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none break-words overflow-x-hidden">
              {thesis}
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-base-200 rounded-lg p-4 sm:p-6 overflow-x-hidden">
            <h2 className="text-xl font-bold mb-4">Sentiment Analysis</h2>
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

          {/* Google Trends */}
          <div className="bg-base-200 rounded-lg p-4 sm:p-6 overflow-x-hidden">
            <h2 className="text-xl font-bold mb-4">Google Trends Projection</h2>
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
