import {
  VersionedTransaction
} from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";
import fetch from 'cross-fetch';
import { JUPITER_QUOTE } from "@utils/endpoints";

export type SignCreateData = {
  tx: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignCreateData>
) {
  if (req.method !== "POST") {
    res.status(405).json({ tx: "" });
    return;
  }

  try {
    const { publicKeyStr, privateKey, inputMint, outputMint, amount, slippageBps } = req.body;

    if (!privateKey || !inputMint || !outputMint || !amount || !slippageBps || !publicKeyStr) {
      // res.status(400).send( 'Missing required fields');
      return;
    }

    // Get the quote for the swap
    const quoteResponse = await (
      await fetch(`${JUPITER_QUOTE}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`)
    ).json();

    // Get the serialized transactions for the swap
    const swapResponse = await (
      await fetch(`${JUPITER_QUOTE}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: publicKeyStr,
          wrapAndUnwrapSol: true
        })
      })
    ).json();

    // Deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    // transaction.feePayer = publicKey;

    // transaction.recentBlockhash = blockHash;

    // Serialize the transaction
    const serializedTransaction = transaction.serialize();

    const txBase64 = serializedTransaction.toString();

    res.status(200).json({ tx: txBase64 });
  } catch (error: any) {
    console.error('Error executing swap:', error);
    // res.status(500).send({ message: 'Error executing swap', error: error.message });
  }
}
