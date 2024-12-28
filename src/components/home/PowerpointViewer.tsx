'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface PowerPointViewerProps {
    summary: {
        summary: Array<{
            symbol: string;
            name: string;
            amount: number;
            usdValue: number;
        }>;
        totalValue: number;
        totalTokens: number;
    };
    thesis: string;
}

export default function PowerPointViewer({ summary, thesis }: PowerPointViewerProps) {
    const [pptxData, setPptxData] = useState<string | null>(null);
    const [pptxUrl, setPptxUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewerKey, setViewerKey] = useState(0); // Add this to force iframe refresh

    const handleGeneratePptx = async () => {
        setLoading(true);
        setError(null);
        try {
            // Generate PowerPoint
            const response = await axios.post('/api/generate-powerpoint', {
                tokens: summary.summary,
                totalTokens: summary.totalTokens,
                totalValue: summary.totalValue,
                thesis: thesis,
            });

            if (!response.data.pptxBase64) {
                throw new Error('No base64 data received from API');
            }

            // Store PowerPoint data and get temporary URL
            const storeResponse = await axios.post('/api/serve-powerpoint', {
                base64Data: response.data.pptxBase64
            });

            const publicUrl = `${window.location.origin}/api/serve-powerpoint?id=${storeResponse.data.id}`;
            setPptxUrl(publicUrl);
            setViewerKey(prev => prev + 1); // Force iframe refresh when new URL is set

            // Create blob URL for download
            const byteCharacters = atob(response.data.pptxBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {
                type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            });
            const url = URL.createObjectURL(blob);
            setPptxData(url);
            console.log(url);

        } catch (error) {
            console.error('Error in PowerPoint generation:', error);
            setError(error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (pptxData) {
                URL.revokeObjectURL(pptxData);
            }
        };
    }, [pptxData]);

    const handleDownload = () => {
        if (pptxData) {
            const link = document.createElement('a');
            link.href = pptxData;
            link.download = 'investment-thesis.pptx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <button
                    onClick={handleGeneratePptx}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                    {loading ? 'Generating...' : 'Generate PowerPoint'}
                </button>

                {pptxData && (
                    <button
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
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pptxUrl)}&embedded=true`}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
