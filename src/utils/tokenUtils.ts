import { AddressLookupTableAccount, Connection, PublicKey, PublicKeyInitData, TransactionInstruction } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import Bottleneck from "bottleneck";
import { fetchIpfsMetadata } from "./fetchIpfsMetadata";
import { extractCidFromUrl } from "./extractCidFromUrl";
import { fetchJupiterSwap } from "./fetchJupiterSwap";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TOKEN_PROGRAM_ID_ADDRESS } from "@utils/globals";
import { Instruction } from "@jup-ag/api";
import { fetchFloorPrice } from "./fetchFloorPrice";

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT!;
const connection = new Connection(RPC_ENDPOINT);
const metaplex = Metaplex.make(connection);
const DEFAULT_IMAGE_URL = process.env.UNKNOWN_IMAGE_URL || "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

// Rate limiters
const rpcLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 100 });
export const apiLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 100 });

export type TokenData = {
  decimals: number;
  mintAddress: string;
  tokenAddress: string;
  name?: string;
  amount: number;
  symbol?: string;
  logo?: string;
  cid?: string | null;
  usdValue: number;
  collectionName?: string;
  collectionLogo?: string;
  isNft?: boolean;
};

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

      const cid = extractCidFromUrl(token.uri);
      console.log(cid ? `CID found: ${cid}` : `No CID, Using ${token.json?.image ?? DEFAULT_IMAGE_URL}`);
      let metadata = {
        name: token?.name,
        symbol: token?.symbol,
        logo: token.json?.image ?? DEFAULT_IMAGE_URL,
        cid,
        collectionName: token?.name,
        collectionLogo: token.json?.image ?? DEFAULT_IMAGE_URL,
        isNft: false
      };

      if (cid) {
        const newMetadata = await apiLimiter.schedule(() =>
          fetchIpfsMetadata(cid)
        );
        metadata.logo = newMetadata.imageUrl ?? token.json?.image;
      }

      // Check if the token is part of a collection (NFT)
      if (token.collection) {
        const collectionMetadata = await fetchCollectionMetadata(token.collection.address);
        // console.log(`Collection metadata: ${JSON.stringify(collectionMetadata)}`);
        metadata = {
          ...metadata,
          collectionName: collectionMetadata?.name ?? token?.name,
          collectionLogo: collectionMetadata?.logo ?? token.json?.image,
          isNft: true
        };
      }

      return metadata;
    }
  } catch (error) {
    console.error("Error fetching token metadata for:", mint, error);
    return { name: mint, symbol: mint, logo: DEFAULT_IMAGE_URL, cid: null, collectionName: mint, collectionLogo: DEFAULT_IMAGE_URL, isNft: false };
  }
}

async function fetchCollectionMetadata(collectionAddress: PublicKey) {
  try {
    const metadataAccount = metaplex
      .nfts()
      .pdas()
      .metadata({ mint: collectionAddress });

    const metadataAccountInfo = await rpcLimiter.schedule(() =>
      connection.getAccountInfo(metadataAccount)
    );

    if (metadataAccountInfo) {
      const collection = await rpcLimiter.schedule(() =>
        metaplex.nfts().findByMint({ mintAddress: collectionAddress })
      );

      const cid = extractCidFromUrl(collection.uri);
      if (cid) {
        const collectionMetadata = await apiLimiter.schedule(() =>
          fetchIpfsMetadata(cid)
        );
        return {
          name: collection.name,
          symbol: collection.symbol,
          logo: collectionMetadata.imageUrl ?? DEFAULT_IMAGE_URL,
          cid: cid,
          isNft: collectionMetadata?.name ? true : false
        };
      } else {
        return {
          name: collection.name,
          symbol: collection.symbol,
          logo: collection.json?.image ?? DEFAULT_IMAGE_URL,
          cid: null,
          isNft: true
        };
      }
    }
  } catch (error) {
    console.error("Error fetching collection metadata:", error);
    return {
      name: "Unknown",
      symbol: "Unknown",
      logo: DEFAULT_IMAGE_URL,
      cid: null,
      isNft: false
    };
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
  // Need to add check if NFT to get floor price as price
  let price = 0
  if (metadata && metadata.isNft) {
    const floorPrice = await apiLimiter.schedule(() =>
      fetchFloorPrice(mintAddress)
    );
    // Get floor price
    // console.log(`Is NFT: ${metadata?.isNft}, Getting floor price for ${metadata?.collectionName}(${mintAddress})`)
    price = floorPrice.usdValue || 0;
    console.log(`${metadata.collectionName} NFT Floor price: $${price}`)
  } else {
    price = jupiterPrice.data[mintAddress]?.price || 0;
  }

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
