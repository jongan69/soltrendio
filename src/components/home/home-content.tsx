import React, { useEffect, useState, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-hot-toast";
import { Circles } from "react-loader-spinner";
import { useTokenBalance } from "@utils/hooks/useTokenBalance";
import { DEFAULT_WALLET, FEE_ADDRESS, DEFAULT_TOKEN } from "@utils/globals";
import { apiLimiter, fetchTokenAccounts, handleTokenData, TokenData } from "../../utils/tokenUtils";
import { Connection, PublicKey, Transaction, SystemProgram, PublicKeyInitData } from "@solana/web3.js";
import SentimentCharts from "./SentimentCharts";
import GoogleTrendsProjection from "./GoogleTrendsProjection";
import axios from "axios";
import { NETWORK } from "@utils/endpoints";

export function HomeContent() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
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
  const [topSymbols, setTopSymbols] = useState([]);
  const connection = new Connection(NETWORK);

  useEffect(() => {
    if (publicKey && publicKey.toBase58() !== prevPublicKey.current) {
      prevPublicKey.current = publicKey.toBase58();
      setSignState("initial");
    }
  }, [publicKey]);

  const updateTotalValue = useCallback((usdValue: number) => {
    setTotalValue((prevValue) => prevValue + usdValue);
  }, []);

  const fetchSentimentAnalysis = async (text: any) => {
    try {
      const response = await axios.post("/api/sentiment-analysis", { text });
      let parsedResponse = JSON.parse(response.data.thesis);
      console.log(parsedResponse);
      setRacismScore(parsedResponse.racism);
      setHateSpeechScore(parsedResponse.hateSpeech);
      setDrugUseScore(parsedResponse.drugUse);
    } catch (error) {
      console.error("Error fetching sentiment analysis:", error);
    }
  };

  const fetchGoogleTrends = async (tokens: any) => {
    try {
      // Sort tokens by usdValue in descending order and take the top 20
      const topTokens = tokens?.sort((a: { usdValue: number }, b: { usdValue: number }) => b.usdValue - a.usdValue).slice(0, 3);
      // Extract symbols from the top tokens and filter out any undefined values
      let symbols = topTokens.map((token: { symbol: any }) => token.symbol).filter((symbol: any) => symbol !== undefined);
      setTopSymbols(symbols)

      console.log("Looking for keywords:", symbols);
      const response = await fetch('/api/trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: symbols }),
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

  const summarizeTokenData = (tokens: any[]) => {
    const summary = tokens.map((token: { symbol: string; amount: any; usdValue: any; }) => ({
      symbol: token.symbol,
      amount: token.amount,
      usdValue: token.usdValue,
    }));

    // Aggregate data for overall summary
    const totalValue = tokens.reduce((acc: any, token: { usdValue: any; }) => acc + token.usdValue, 0);
    const totalTokens = tokens.length;

    return {
      summary,
      totalValue,
      totalTokens,
    };
  };

  const generateThesis = async (tokens: { name?: string | undefined; symbol?: string | undefined; logo?: string | undefined; cid?: string | null | undefined; collectionName?: string | undefined; collectionLogo?: string | undefined; isNft?: boolean | undefined; mintAddress: any; tokenAddress: string; amount: any; decimals: any; usdValue: number; }[]) => {
    const summarizedData = summarizeTokenData(tokens);

    try {
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
      return data.thesis;
    } catch (error) {
      console.error("Error generating thesis:", error);
      return "An error occurred while generating the thesis.";
    }
  };

  const handleGenerateNewThesis = async () => {
    if (specificTokenBalance === 0 && publicKey) {
      // Charge a small Solana transaction if the specific token balance is 0
      try {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(DEFAULT_WALLET),
            lamports: 1000, // Small fee in lamports
          })
        );

        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        toast.success("Fee transaction successful, generating new thesis...");
      } catch (error) {
        toast.error("Transaction failed, please try again");
        console.error(error);
        return;
      }
    }

    setLoading(true);
    try {
      const newThesis = await generateThesis(tokens);
      setThesis(newThesis);

      // Fetch sentiment analysis and Google Trends data
      if (newThesis) await fetchSentimentAnalysis(newThesis);
      if (tokens) await fetchGoogleTrends(tokens);

      toast.success("New Thesis Generated");
    } catch (error) {
      toast.error("Error generating new thesis");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTweetThis = () => {
    const tweetText = encodeURIComponent(`Investment Thesis using https://soltrendio.com:\n\n${thesis}`);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(tweetUrl, "_blank");
  };

  const handleAddressSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setSubmittedAddress(manualAddress);
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
          <form onSubmit={handleAddressSubmit} className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
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
          <div className="bg-base-200 rounded-lg p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Wallet Overview</h2>
              <div className="text-right">
                <p className="text-sm">Lockin Balance</p>
                <p className="text-lg font-bold">{specificTokenBalance}</p>
              </div>
            </div>
          </div>

          {/* Thesis Section */}
          <div className="bg-base-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Investment Thesis</h2>
              <div className="space-x-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleGenerateNewThesis}
                >
                  Generate New
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleTweetThis}
                >
                  Tweet
                </button>
              </div>
            </div>
            <div className="prose max-w-none">
              {thesis}
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-base-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Sentiment Analysis</h2>
            <SentimentCharts
              racismScore={racismScore}
              hateSpeechScore={hateSpeechScore}
              drugUseScore={drugUseScore}
            />
          </div>

          {/* Google Trends */}
          <div className="bg-base-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Google Trends Projection</h2>
            <GoogleTrendsProjection
              trendsData={trendsData}
              dataNames={topSymbols}
            />
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
