export declare function getDataEnumEncoder(data: any): string;

declare global {
    interface Window {
      paymentChoice: (choice: 'sol' | 'token1' | 'token2' | 'token3' | 'cancel') => void;
    }
  }