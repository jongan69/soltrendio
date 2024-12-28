export function isSolanaAddress(str: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);
  }