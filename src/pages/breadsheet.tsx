import { useState } from 'react';
import WalletHoldingsTable from '../components/WalletHoldingsTable';

export default function WalletHoldings() {
  const [address, setAddress] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">BreadSheet</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Compare solana address holdings&apos; current market caps to all-time high market caps.
            Enter your wallet address or .sol domain below to get started.
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label htmlFor="wallet-address" className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address or .sol Domain
            </label>
            <div className="flex gap-4">
              <input
                id="wallet-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Solana wallet address or .sol domain"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-150 ease-in-out"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Example: &ldquo;abc...xyz&rdquo; or &ldquo;mydomain.sol&rdquo;
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="max-w-6xl mx-auto">
          {address && <WalletHoldingsTable address={address} />}
        </div>
      </div>
    </div>
  );
} 