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
  const connection = new Connection("https://api.mainnet-beta.solana.com");

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
          const tokenAccounts = await fetchTokenAccounts(new PublicKey(walletAddress));
          setTotalAccounts(tokenAccounts.value.length);

          const tokenDataPromises = tokenAccounts.value.map((tokenAccount) =>
            handleTokenData(new PublicKey(walletAddress), tokenAccount, apiLimiter).then((tokenData) => {
              updateTotalValue(tokenData.usdValue);
              return tokenData;
            })
          );

          const tokens = await Promise.all(tokenDataPromises);
          setTokens(tokens);

          // Check the balance of the specific token
          const specificTokenAccount = tokenAccounts.value.find(account => account.account.data.parsed.info.mint === DEFAULT_TOKEN);
          const specificTokenAmount = specificTokenAccount ? specificTokenAccount.account.data.parsed.info.tokenAmount.uiAmount : 0;
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
          toast.error("Error verifying wallet, please reconnect wallet", { id: signToastId });
          console.error(error);
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
      if (thesis) await fetchSentimentAnalysis(thesis);
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
    const tweetText = encodeURIComponent(`Investment Thesis: ${thesis}`);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(tweetUrl, "_blank");
  };

  const handleAddressSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setSubmittedAddress(manualAddress);
  };

  if (loading || !tokens || signState === "loading") {
    return (
      <>
        <p>Found {totalAccounts} Accounts, Getting Token Data...</p>
        <div className="flex justify-center items-center h-screen">
          <Circles color="#00BFFF" height={80} width={80} />
        </div>
      </>
    );
  }

  if ((publicKey || submittedAddress) && signState === "success" && tokens.length === 0) {
    return <p className="text-center p-4">Loading wallet information...</p>;
  }

  const hasFetchedData = (publicKey || submittedAddress) && signState === "success" && tokens.length > 0 && totalAccounts > 0;

  return (
    <div className="grid grid-cols-1">
      {!publicKey && !submittedAddress && (
        <div className="text-center p-4">
          <form onSubmit={handleAddressSubmit}>
            <label className="block mb-2">Enter your Solana wallet address:</label>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              className="p-2 border rounded mb-4 w-full"
            />
            <button type="submit" className="btn btn-primary">Submit</button>
          </form>
        </div>
      )}
      {hasFetchedData ? (
        <div>
          <p className="text-center p-4">Lockin Balance: {specificTokenBalance}</p>
          <h2 className="text-center p-4">Investment Thesis</h2>
          {`${thesis}`}
          <h2 className="text-center p-4">Sentiment Analysis</h2>
          <SentimentCharts
            racismScore={racismScore}
            hateSpeechScore={hateSpeechScore}
            drugUseScore={drugUseScore}
          />
          <h2 className="text-center p-4">Google Trends Projection</h2>
          <GoogleTrendsProjection trendsData={trendsData} dataNames={topSymbols}/>
          <div className="text-center p-4">
            <button className="btn btn-primary m-2" onClick={handleGenerateNewThesis}>
              Generate New Thesis
            </button>
            <button className="btn btn-secondary m-2" onClick={handleTweetThis}>
              Tweet This
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-center p-4">
            This app allows users to analyze their wallet holdings to generate a thesis.
          </p>
          {!publicKey && !submittedAddress && (
            <div className="card border-2 border-primary mb-5">
              <div className="card-body items-center">
                <h2 className="card-title text-center text-primary mb-2">
                  Please connect your wallet or submit your address...
                </h2>
              </div>
            </div>
          )}
          {signState === "error" && (
            <div className="card border-2 border-primary mb-5">
              <div className="card-body items-center text-center">
                <h2 className="card-title text-center mb-2">
                  {`Please disconnect and reconnect your wallet. You might need to reload the page. You might have too many tokens and we're being rate limited. Thank you 🔒`}
                </h2>
              </div>
            </div>
          )}
        </div>
      )}
      {balance > 0 && <p className="text-center p-4">Total LOCKINS Generated: {balance.toFixed(5)}</p>}
    </div>
  );
}
