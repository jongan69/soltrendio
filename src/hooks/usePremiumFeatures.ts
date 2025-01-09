import { useState } from "react";

import { checkPremiumStatus } from "@utils/checkPremiumStatus";
import { useEffect } from "react";
// import { PremiumAnalytics } from "src/types/PremiumAnalytics";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { processTrendPayment } from "@utils/processTrendPayment";

export const usePremiumFeatures = (publicKey: PublicKey | null, connection: Connection, sendTransaction: (transaction: Transaction) => Promise<string>) => {
  const [hasPremiumAccess, setHasPremiumAccess] = useState<boolean>(false);
//   const [premiumAnalytics, setPremiumAnalytics] = useState<PremiumAnalytics | null>(null);

  useEffect(() => {
    if (publicKey) {
      checkPremiumStatus(publicKey.toString()).then(setHasPremiumAccess);
    }
  }, [publicKey]);

  const handlePremiumPurchase = async () => {
    const confirmation = await processTrendPayment(publicKey!, connection, 100000, sendTransaction);
    if (confirmation) {
      setHasPremiumAccess(true);
    }
  };

  return { hasPremiumAccess, handlePremiumPurchase };
}; 