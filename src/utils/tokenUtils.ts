import { AddressLookupTableAccount, Connection, PublicKey, PublicKeyInitData, TransactionInstruction } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import Bottleneck from "bottleneck";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID_ADDRESS } from "@utils/globals";
import { Instruction } from "@jup-ag/api";
import { NETWORK } from "@utils/endpoints";
import { fetchJupiterSwap } from "./fetchJupiterSwap";

const connection = new Connection(NETWORK);
const metaplex = Metaplex.make(connection);
const DEFAULT_IMAGE_URL = process.env.UNKNOWN_IMAGE_URL || "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

// Rate limiters
const rpcLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });
export const apiLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 100 });

export interface TokenData {
  mintAddress: string;
  tokenAddress: string;
  amount: number;
  decimals: number;
  usdValue: number;
  isNft?: boolean;
  name?: string;
  symbol?: string;
  logo?: string;
  cid?: string;
  collectionName?: string;
  collectionLogo?: string;
}

export async function fetchTokenMetadata(mintAddress: PublicKey, mint: string) {
  try {
    const metadataAccount = metaplex
      .nfts()
      .pdas()
      .metadata({ mint: mintAddress });

    const metadataAccountInfo = await rpcLimiter.schedule(() =>
      connection.getAccountInfo(metadataAccount)
    );

    if (metadataAccountInfo) {
      const token = await rpcLimiter.schedule(() =>
        metaplex.nfts().findByMint({ mintAddress: mintAddress })
      );

      return {
        name: token?.name,
        symbol: token?.symbol,
        logo: token.json?.image ?? DEFAULT_IMAGE_URL,
      };
    }
  } catch (error) {
    console.error("Error fetching token metadata for:", mint, error);
    return { name: mint, symbol: mint, logo: DEFAULT_IMAGE_URL };
  }
}

export async function fetchTokenAccounts(publicKey: PublicKey) {
  return rpcLimiter.schedule(() =>
    connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID_ADDRESS,
    })
  );
}

export async function handleTokenData(
  publicKey: PublicKey, tokenAccount: any, apiLimiter: any) {
  const mintAddress = tokenAccount.account.data.parsed.info.mint;
  const amount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
  const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals;

  const [tokenAccountAddress] = await PublicKey.findProgramAddress(
    [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(mintAddress).toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const jupiterPrice = await apiLimiter.schedule(() =>
    fetchJupiterSwap(mintAddress)
  );

  const metadata = await fetchTokenMetadata(new PublicKey(mintAddress), mintAddress);
  const price = jupiterPrice.data[mintAddress]?.price || 0;
  const usdValue = amount * price;
  
  return {
    mintAddress,
    tokenAddress: tokenAccountAddress.toString(),
    amount,
    decimals,
    usdValue,
    ...metadata,
  };
}

export const deserializeInstruction = (instruction: Instruction) => {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key: { pubkey: PublicKeyInitData; isSigner: any; isWritable: any; }) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
};

export const getAddressLookupTableAccounts = async (connection: Connection, keys: any[]) => {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce<AddressLookupTableAccount[]>((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      if (typeof addressLookupTableAccount !== "undefined") {
        acc.push(addressLookupTableAccount);
      }
    }
    return acc;
  }, []);
};
