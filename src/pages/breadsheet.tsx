import { useState } from 'react';
import WalletHoldingsTable from '../components/WalletHoldingsTable';

export default function WalletHoldings() {
  const [address, setAddress] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white dark:text-white mb-4">BreadSheet</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Compare solana address holdings&apos; current market caps to all-time high market caps.
            Enter your wallet address or .sol domain below to get started.
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/20 p-6">
            <label htmlFor="wallet-address" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Wallet Address or .sol Domain
            </label>
            <div className="flex gap-4">
              <input
                id="wallet-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Solana wallet address or .sol domain"
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400 transition duration-150 ease-in-out"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
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