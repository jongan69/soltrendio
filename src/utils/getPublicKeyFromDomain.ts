import { getDomainKeySync } from "@bonfida/spl-name-service";
import { NameRegistryState } from "@solana/spl-name-service";
import { Connection } from "@solana/web3.js";

export const getPublicKeyFromSolDomain = async (domain: string, connection: Connection): Promise<string> => {
    try {
      const cleanDomain = domain.toLowerCase().replace('.sol', '');
      const { pubkey } = getDomainKeySync(cleanDomain);
      const owner = (await NameRegistryState.retrieve(connection, pubkey)).owner.toBase58();
      return owner;
    } catch (error) {
      console.warn('Error resolving SNS domain:', error);
      return error instanceof Error ? error.message : 'Unknown error';
    }
  };