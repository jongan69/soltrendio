import { useState } from 'react';
import WalletHoldingsTable from '../components/WalletHoldingsTable';

export default function WalletHoldings() {
  const [address, setAddress] = useState('');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Solana wallet address"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {address && <WalletHoldingsTable address={address} />}
    </div>
  );
} 