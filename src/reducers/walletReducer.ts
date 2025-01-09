import { TokenData } from "@utils/tokenUtils";

type WalletState = {
  tokens: TokenData[];
  totalAccounts: number;
  totalValue: number;
  specificTokenBalance: number;
  feeTokenBalance: number;
};

type WalletAction = 
  | { type: 'SET_TOKENS'; payload: TokenData[] }
  | { type: 'SET_TOTAL_ACCOUNTS'; payload: number }
  | { type: 'UPDATE_TOTAL_VALUE'; payload: number }
  | { type: 'SET_TOKEN_BALANCE'; payload: number }
  | { type: 'SET_FEE_BALANCE'; payload: number };

export const walletReducer = (state: WalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case 'SET_TOKENS':
      return { ...state, tokens: action.payload };
    case 'SET_TOTAL_ACCOUNTS':
      return { ...state, totalAccounts: action.payload };
    // ... other cases
    default:
      return state;
  }
}; 