import { Item } from "@components/home/item"; // Import the Item component
import { useConnection, useWallet } from "@solana/wallet-adapter-react"; // Import hooks for Solana wallet and connection
import { PublicKey, TransactionInstruction } from "@solana/web3.js"; // Import PublicKey and TransactionInstruction from Solana web3.js
import React, { useState, useEffect } from "react"; // Import React and necessary hooks
import { toast } from "react-hot-toast"; // Import toast for notifications
import { DEFAULT_TOKEN, DEFAULT_WALLET, REFER_PROGRAM_ID, REFERAL_WALLET } from "@utils/globals"; // Import global constants
import { useSendBatchTransaction } from "@utils/hooks/useSendBatchTransaction"; // Import hook to send batch transactions
import { useCloseTokenAccount } from "@utils/hooks/useCloseTokenAccount"; // Import hook to close token accounts
import { TokenData } from "@utils/tokenUtils"; // Import TokenData type
import { useCreateSwapInstructions } from "@utils/hooks/useCreateSwapInstructions"; // Import hook to create swap instructions

type Props = {
  initialItems: Array<TokenData>; // Define prop type for initial items
  totalValue: number; // Define prop type for total value
};

export const ItemList = ({ initialItems, totalValue }: Props) => {
  const { publicKey, sendTransaction, signAllTransactions } = useWallet(); // Get wallet details from useWallet hook
  const { connection } = useConnection(); // Get connection from useConnection hook
  const { closeTokenAccount } = useCloseTokenAccount(); // Get closeTokenAccount function from useCloseTokenAccount hook

  const [items] = useState<TokenData[]>(initialItems); // Initialize items state
  const [sortedItems, setSortedItems] = useState<TokenData[]>(initialItems); // Initialize sorted items state
  const [selectedItems, setSelectedItems] = useState<Set<TokenData>>(new Set()); // Initialize selected items state
  const [closedTokenAccounts, setClosedTokenAccounts] = useState(new Set()); // Initialize closed token accounts state
  const [closableTokenAccounts, setClosableTokenAccounts] = useState(initialItems); // Initialize closable token accounts state
  const [nfts, setNfts] = useState(initialItems); // Initialize NFTs state
  const [tipAmount, setTipAmount] = useState(1000); // Initialize tip amount state

  const [showPopup, setShowPopup] = useState(false); // State to show/hide popup
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State for error message
  const [message, setMessage] = useState(''); // State for general message
  const raydiumUrl = "https://raydium.io/swap/?inputMint=sol&outputMint=8Ki8DpuWNxu9VsS3kQbarsCWMcFGWkzzA8pUPto9zBd5&referrer=9yA9LPCRv8p8V8ZvJVYErrVGWbwqAirotDTQ8evRxE5N"; // URL for Raydium swap
  const targetTokenMintAddress = DEFAULT_TOKEN; // Target token mint address
  const dustReceiver = new PublicKey(DEFAULT_WALLET); // Dust receiver public key
  const referralAccountPubkey = new PublicKey(REFERAL_WALLET); // Referral account public key
  const referralProgramId = REFER_PROGRAM_ID; // Referral program ID

  const { sendTransactionBatch, sending: sendingBatch } = useSendBatchTransaction();

  const { handleClosePopup, sending } = useCreateSwapInstructions(
    publicKey,
    connection,
    signAllTransactions,
    targetTokenMintAddress,
    dustReceiver,
    referralAccountPubkey,
    referralProgramId,
    tipAmount, // Use the state variable instead of the hardcoded value
    setShowPopup,
    setSelectedItems,
    setClosedTokenAccounts
  );

  const handleItemClick = (item: TokenData) => {
    if (item.isNft && item.amount > 0) {
      return; // Ignore selection if the item is an NFT as we can't do anything with it 
    }
    if (item.mintAddress === targetTokenMintAddress) {
      toast.error("Lock tf in bro."); // Show error toast
      setErrorMessage("Error: You are already lock maxing this token.");
      window.open(raydiumUrl, '_blank'); // Open Raydium URL in a new tab
      return;
    }
    setSelectedItems(prev => {
      const newSelectedItems = new Set(prev);
      if (newSelectedItems.has(item)) {
        newSelectedItems.delete(item); // Remove item from selected items
      } else {
        newSelectedItems.add(item); // Add item to selected items
      }
      return newSelectedItems;
    });
  };

  const handleTipChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value)) {
      setTipAmount(value); // Update tip amount state
    }
  };

  const handleConfirmSelection = () => {
    if (selectedItems.size > 0) {
      setShowPopup(true); // Show confirmation popup
      setErrorMessage(null); // Reset error message
    } else {
      toast.error("Please select at least one item."); // Show error toast
    }
  };

  const handleCloseTokenAccounts = async () => {
    if (closableTokenAccounts.length > 0 && publicKey && signAllTransactions) {
      let closeAccountInstructions: TransactionInstruction[] = [];
      for (const closable of closableTokenAccounts) {
        const closeAccountInstr = await closeTokenAccount(new PublicKey(closable.tokenAddress)); // Get close account instruction
        closeAccountInstructions.push(closeAccountInstr); // Add instruction to list
      }
      // Send transaction batch to close token accounts
      await sendTransactionBatch(closeAccountInstructions, publicKey, signAllTransactions, connection, setMessage, sendTransaction, 'Closing token accounts');
      setClosableTokenAccounts([]); // Reset closable token accounts
    } else {
      toast.error("Error Closing Token Accounts, Please Reload Page."); // Show error toast
      setClosableTokenAccounts([]); // Reset closable token accounts
    }
  };

  useEffect(() => {
    const sortedItems = [...items]
      .filter(item => !closedTokenAccounts.has(item.tokenAddress))
      .filter(item => !item?.isNft)
      .filter(item => (item.amount !== 0 && item.usdValue !== 0))
      .sort((a, b) => b.usdValue - a.usdValue);
    setSortedItems(sortedItems); // Update sorted items state
  }, [closedTokenAccounts, items]);

  useEffect(() => {
    const nfts = [...items]
      .filter(item => !closedTokenAccounts.has(item.tokenAddress))
      .filter(item => item?.isNft)
      .sort((a, b) => b.usdValue - a.usdValue);
    setNfts(nfts); // Update NFTs state
  }, [closedTokenAccounts, items]);

  useEffect(() => {
    const closeableItems = [...items]
      .filter(item => !closedTokenAccounts.has(item.tokenAddress))
      .filter(item => item.amount === 0 && item.usdValue === 0);
    setClosableTokenAccounts(closeableItems); // Update closable token accounts state
  }, [closedTokenAccounts, items]);

  return (
    <div>
      <h2 className="text-center text-primary m-10">{items.length} Token Accounts</h2>
      <h2 className="text-center text-primary m-10">Total Estimated Accounts Value: ${totalValue.toFixed(2)}</h2>
      {/* <div className="tip-amount-container">
        <label htmlFor="tip-amount" className="block text-sm font-medium text-white bold">
          Jito Bundle Tip Amount (lamports):
        </label>
        <input
          type="number"
          id="tip-amount"
          value={tipAmount}
          onChange={handleTipChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div> */}
      {/* <h1 className="text-center text-primary m-10">Swappable Tokens</h1> */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.length === 0 || !sortedItems ? (
          <p className="p-4">No Coins found in your wallet</p>
        ) : (
          <>
            {sortedItems.map((item, index) => (
              <div
                key={index}
                onClick={() => handleItemClick(item)} // Handle item click event
                className={`transform transition-transform duration-300 hover:scale-105 custom-lock-cursor ${selectedItems.has(item) ? 'selected-item' : ''}`}
              >
                <Item data={item} /> {/* Render Item component */}
              </div>
            ))}
          </>
        )}
      </div>

      {nfts.length > 0 && (
        <>
          <h1 className="text-center text-primary m-10">NFTs</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nfts.map((item, index) => (
              <div
                key={index}
                onClick={() => handleItemClick(item)} // Handle item click event
                className={`transform transition-transform duration-300 hover:scale-105 custom-lock-cursor ${selectedItems.has(item) ? 'selected-item' : ''}`}
              >
                <Item data={item} /> {/* Render Item component */}
              </div>
            ))}
          </div>
        </>
      )}

      {closableTokenAccounts.length > 0 && (
        <>
          <h1 className="text-center text-primary m-10">Closable Token Accounts</h1>
          {closableTokenAccounts.map((item, index) => (
            <div
              key={index}
              onClick={() => handleItemClick(item)} // Handle item click event
              className={`transform transition-transform duration-300 hover:scale-105 py-2 custom-lock-cursor ${selectedItems.has(item) ? 'selected-item' : ''}`}
            >
              <Item data={item} /> {/* Render Item component */}
            </div>
          ))}
        </>
      )}

      {closableTokenAccounts.length > 0 && (
        <button
          onClick={handleCloseTokenAccounts} // Handle close token accounts event
          className="close-token-accounts-button"
        >
          Close ({closableTokenAccounts.length} Accounts)
        </button>
      )}

      {selectedItems.size > 0 && (
        <button
          onClick={handleConfirmSelection} // Handle confirm selection event
          className="confirm-selection-button"
        >
          Lockin ({selectedItems.size} Selected)
        </button>
      )}

      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-sm w-full">
            <p className="text-lg font-semibold">Do you want to lock MAX your selected tokens?</p>
            <p className="text-sm text-gray-600 mt-2">**NOTE THIS WILL SELL ALL YOUR SELECTED TOKENS**</p>
            {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
            {message && <p className="text-blue-500 mt-2">{message}</p>}
            <div className="flex justify-around mt-4">
              <button
                onClick={() => handleClosePopup(true, selectedItems, setMessage, setErrorMessage)} // Handle confirm action
                disabled={sendingBatch}
              >
                {sendingBatch || sending ? 'Processing...' : `${errorMessage ? 'Retry' : 'Yes'}`}
              </button>
              <button
                onClick={() => handleClosePopup(false, selectedItems, setMessage, setErrorMessage)} // Handle cancel action
                disabled={sendingBatch}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemList;
