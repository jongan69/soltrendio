'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DEFAULT_TOKEN_3_NAME } from '@utils/globals';

interface PowerpointViewerProps {
    summary: any;
    thesis: string;
    cost: number;
    onGenerate: () => Promise<boolean>;
}

export default function PowerPointViewer({ summary, thesis, cost, onGenerate }: PowerpointViewerProps) {
    const [pptxUrl, setPptxUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewerKey, setViewerKey] = useState(0);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        const paymentSuccessful = await onGenerate();
        
        if (paymentSuccessful) {
            try {
                // Filter and prepare the data to reduce size
                const filteredSummary = summary.summary
                    .filter((token: any) => token && typeof token === 'object')
                    .map((token: any) => ({
                        name: String(token.name || '').slice(0, 100),
                        symbol: String(token.symbol || '').slice(0, 20),
                        image: String(token.image || ''),
                        usdValue: Number(token.usdValue) || 0,
                        marketCap: Number(token.marketCap) || 0,
                        isNft: Boolean(token.isNft)
                    }))
                    .slice(0, 50);

                // Remove markdown formatting and clean thesis
                const cleanMarkdown = (text: string): string => {
                    let previous;
                    do {
                        previous = text;
                        text = text
                            // Remove bold/italic markers
                            .replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, '$1')
                            // Remove headers
                            .replace(/#{1,6}\s+/g, '')
                            // Remove bullet points
                            .replace(/^[-*+]\s+/gm, '')
                            // Remove numbered lists
                            .replace(/^\d+\.\s+/gm, '')
                            // Remove code blocks
                            .replace(/```[\s\S]*?```/g, '')
                            .replace(/`([^`]+)`/g, '$1')
                            // Remove blockquotes
                            .replace(/^\s*>\s+/gm, '')
                            // Remove horizontal rules
                            .replace(/^[-*_]{3,}\s*$/gm, '')
                            // Remove links
                            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                            // Remove images
                            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
                            // Remove HTML tags
                            .replace(/<[^>]*>/g, '')
                            // Fix multiple spaces
                            .replace(/\s+/g, ' ')
                            // Fix multiple newlines
                            .replace(/\n+/g, '\n')
                            .trim();
                    } while (text !== previous);
                    return text;
                };

                // Clean and truncate thesis to complete sentences
                const cleanThesis = thesis ? (
                    cleanMarkdown(thesis)
                        .split(/[.!?]+\s+/) // Split into sentences
                        .reduce((acc: string[], sentence: string) => {
                            // Check if adding this sentence would exceed the limit
                            const potentialLength = acc.join('. ').length + sentence.length + 2;
                            if (potentialLength <= 5000) {
                                acc.push(sentence.trim());
                            }
                            return acc;
                        }, [])
                        .join('. ') // Rejoin with periods
                        .trim()
                        .replace(/[.!?]*$/, '.') // Ensure it ends with a period
                ) : '';

                const payload = {
                    tokens: filteredSummary,
                    totalTokens: Math.min(summary.totalTokens || 0, 50),
                    totalValue: Number(summary.totalValue) || 0,
                    thesis: cleanThesis,
                };

                console.log('Sending request with payload:', JSON.stringify(payload, null, 2));

                const response = await axios.post('/api/pptx/generate-powerpoint', payload, {
                    timeout: 300000,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    validateStatus: (status) => status < 500,
                });

                if (!response.data || !response.data.id) {
                    throw new Error('Invalid response from server: ' + JSON.stringify(response.data));
                }

                const publicUrl = `${window.location.origin}/api/pptx/serve-powerpoint?id=${response.data.id}`;
                console.log('Generated PowerPoint URL:', publicUrl);
                setPptxUrl(publicUrl);
                setViewerKey(prev => prev + 1);
            } catch (error: any) {
                console.error('Error in PowerPoint generation:', error);
                const errorMessage = error.response?.data?.error 
                    || error.message 
                    || 'Unknown error occurred';
                setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDownload = async () => {
        if (pptxUrl) {
            try {
                const id = new URL(pptxUrl).searchParams.get('id');
                if (!id) throw new Error('No presentation ID found');
                console.log('Downloading PowerPoint with ID:', id);
                const response = await axios.get(`/api/pptx/serve-powerpoint?id=${id}`, {
                    responseType: 'blob',
                    timeout: 300000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    validateStatus: (status) => status < 500,
                });

                if (response.status !== 200) {
                    throw new Error(`Server returned status ${response.status}`);
                }

                const blob = new Blob([response.data], {
                    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'investment-thesis.pptx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (error: any) {
                console.error('Error downloading PowerPoint:', error);
                setError(typeof error === 'string' ? error : error.message || 'Failed to download PowerPoint');
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-center space-x-4 py-10">
                <button
                    disabled={loading}
                    onClick={handleGenerate}
                    className="btn bg-gradient-to-r from-purple-500 to-pink-500 border-none text-white hover:from-purple-600 hover:to-pink-600 shadow-lg"
                >
                    Generate New PowerPoint ({cost} {DEFAULT_TOKEN_3_NAME})
                </button>

                {pptxUrl && (
                    <button
                        disabled={loading}
                        onClick={handleDownload}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        Download PowerPoint
                    </button>
                )}
            </div>

            {error && (
                <div className="text-red-500">
                    Error: {error}
                </div>
            )}

            {pptxUrl && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-700">PowerPoint Preview</h2>
                    </div>
                    <div className="aspect-[4/3] w-full">
                        <iframe
                            key={viewerKey}
                            src={`https://docs.google.com/gview?url=${encodeURIComponent(pptxUrl)}&embedded=true`}
                            width="100%"
                            height="100%"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
