import { AddressLookupTableAccount, Connection, PublicKey, PublicKeyInitData, TransactionInstruction } from "@solana/web3.js";
import {
  mplTokenMetadata,
  findMetadataPda,
  fetchDigitalAssetByMetadata,
  fetchMetadata,
  TokenStandard
} from '@metaplex-foundation/mpl-token-metadata'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import Bottleneck from "bottleneck";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID_ADDRESS } from "@utils/globals";
import { Instruction } from "@jup-ag/api";
import { NETWORK } from "@utils/endpoints";
import { fetchJupiterSwap } from "./fetchJupiterSwap";
import { getDefaultTokenMetadata } from "./getDefaultTokenData";
import { fetchIpfsMetadata } from "./fetchIpfsMetadata";
import { extractCidFromUrl } from "./extractCidFromUrl";
import { processTokenMetadata } from "./processMetadata";
import { withRetry } from "./withRetry";

const connection = new Connection(NETWORK);
const metaplexUmi = createUmi(NETWORK).use(mplTokenMetadata());
const DEFAULT_IMAGE_URL = process.env.UNKNOWN_IMAGE_URL || "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

// Rate limiters
const rpcLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });
export const apiLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 100 });

export interface TokenData {
  name: string;
  mintAddress: string;
  tokenAddress: string;
  amount: number;
  decimals: number;
  usdValue: number;
  symbol: string;
  logo: string;
  cid: null;
  isNft: boolean;
  collectionName: string;
  collectionLogo: string;
  description?: string;
}

export async function fetchTokenMetadata(mintAddress: PublicKey, mint: string) {
  try {
    const metadataPda = findMetadataPda(metaplexUmi, { 
      mint: fromWeb3JsPublicKey(mintAddress) 
    });
    // console.log(`Metadata account: ${metadataPda}`);
    // const metadataAccountInfo = await withRetry(() =>
    //   rpcLimiter.schedule(() => connection.getAccountInfo(new PublicKey(metadataPda)))
    // );    
    const metadataAccountInfo = await fetchDigitalAssetByMetadata(metaplexUmi, metadataPda);
    
    console.log(`Metadata: ${JSON.stringify(metadataAccountInfo, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )}`);

    if (!metadataAccountInfo) {
      return getDefaultTokenMetadata(mint);
    }
    const collectionMetadata = await fetchMetadata(metaplexUmi, metadataPda);
    const cid = collectionMetadata.uri ? extractCidFromUrl(collectionMetadata.uri) : null;
    const logo = cid ? await fetchIpfsMetadata(cid) : null;

    const token = await withRetry(() =>
      rpcLimiter.schedule(() => fetchDigitalAssetByMetadata(metaplexUmi, metadataPda))
    );

    let metadata = await processTokenMetadata(token, logo?.imageUrl ?? '', cid ?? '', mint);
    // Handle collection metadata separately to prevent failures
    const tokenStandard = metadataAccountInfo?.metadata?.tokenStandard?.valueOf();
    const isNft = tokenStandard === TokenStandard.NonFungible || 
                  tokenStandard === TokenStandard.NonFungibleEdition ||
                  tokenStandard === TokenStandard.ProgrammableNonFungible ||
                  tokenStandard === TokenStandard.ProgrammableNonFungibleEdition;
    console.log(`isNft: ${isNft}`);
    if (isNft) {
      const collectionName = collectionMetadata?.name ?? metadata.name;
      const collectionLogo = logo?.imageUrl ?? DEFAULT_IMAGE_URL;
      try {
        metadata = {
          ...metadata,
          collectionName,
          collectionLogo,
          isNft
        };
      } catch (collectionError) {
        console.warn(`Failed to fetch collection metadata for token ${mint}:`, collectionError);
        // Keep existing metadata if collection fetch fails
      }
    }

    return metadata;

  } catch (error) {
    console.warn("Error fetching token metadata for:", mint, error);
    return getDefaultTokenMetadata(mint);
  }
}

export async function fetchTokenAccounts(publicKey: PublicKey) {
  return rpcLimiter.schedule(() =>
    connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID_ADDRESS,
    })
  );
}

export async function fetchNftPrice(mintAddress: string) {
  const response = await apiLimiter.schedule(() =>
    fetch(`api/nfts/nftfloor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ca: mintAddress }),
    })
  );
  return response.json();
}

export async function handleTokenData(publicKey: PublicKey, tokenAccount: any, apiLimiter: any) {
  const mintAddress = tokenAccount.account.data.parsed.info.mint;
  const amount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
  const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals;

  const [tokenAccountAddress] = PublicKey.findProgramAddressSync(
    [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(mintAddress).toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const jupiterPrice = await apiLimiter.schedule(() =>
    fetchJupiterSwap(mintAddress)
  );

  const metadata = await fetchTokenMetadata(new PublicKey(mintAddress), mintAddress);
  // console.log("Metadata:", metadata);

  if (!metadata?.isNft) {
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
  } else {
    // console.log("NFT detected");
    const nftData = await fetchNftPrice(mintAddress);
    // console.log("NFT Data:", nftData);
    const nftPrice = nftData.usdValue ?? 0;
    // console.log(`NFT Floor Price of ${mintAddress}:`, nftPrice);
    return {
      mintAddress,
      tokenAddress: tokenAccountAddress.toString(),
      amount,
      decimals,
      usdValue: nftPrice,
      ...metadata,
    };
  }
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
