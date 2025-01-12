import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface ApiKeyManagerProps {
  walletAddress: string;
}

export function ApiKeyManager({ walletAddress }: ApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing API key on mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/premium/get-api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: walletAddress })
        });
        
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Error fetching API key:', error);
      }
    };

    fetchApiKey();
  }, [walletAddress]);

  const generateApiKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/premium/generate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress })
      });

      const data = await response.json();
      if (data.apiKey) {
        setApiKey(data.apiKey);
        toast.success('API key generated successfully');
      } else {
        throw new Error(data.error || 'Failed to generate API key');
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error('Failed to generate API key');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API key copied to clipboard');
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-purple-200/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">API Access</h3>
      </div>
      
      {apiKey ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={apiKey}
              readOnly
              className="flex-1 input input-bordered"
            />
            <button
              onClick={copyToClipboard}
              className="btn btn-square btn-ghost"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Keep this key secure. It grants access to our API endpoints.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">
            Generate an API key to access our endpoints programmatically.
          </p>
          <button
            onClick={generateApiKey}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Generating...' : 'Generate API Key'}
          </button>
        </div>
      )}
    </div>
  );
} 