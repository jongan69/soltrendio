// Extract the wallet input form into a separate component
export const WalletInputForm = ({ onSubmit, loading, manualAddress, setManualAddress }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void, loading: boolean, manualAddress: string, setManualAddress: (address: string) => void }) => (
    <div className="bg-base-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-8">
      <form onSubmit={onSubmit} className="w-full max-w-md mx-auto">
        <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-4">Connect Your Wallet</h2>
        <label className="block text-sm font-medium mb-2">
          Enter your Solana wallet address or .sol domain:
        </label>
        <input
          type="text"
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          className="w-full p-2 border rounded-md mb-3 sm:mb-4 bg-base-100 text-sm"
          placeholder="Solana address or .sol domain..."
        />
        <button
          type="submit"
          className="btn btn-primary w-full text-sm sm:text-base"
          disabled={loading}
        >
          {loading ? "Resolving..." : "Analyze Wallet"}
        </button>
      </form>
    </div>
  );