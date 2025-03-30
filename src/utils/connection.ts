import { Connection } from '@solana/web3.js';
import { NETWORK } from './endpoints';

/**
 * Singleton connection instance to be reused across the application
 */
export const connection = new Connection(NETWORK, 'confirmed'); 