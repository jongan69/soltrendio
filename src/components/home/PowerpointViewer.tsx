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
                const response = await axios.post('/api/pptx/generate-powerpoint', {
                    tokens: summary.summary,
                    totalTokens: summary.totalTokens,
                    totalValue: summary.totalValue,
                    thesis: thesis,
                }, {
                    timeout: 300000,
                    headers: {
                        'Content-Type': 'application/json',
                        'Transfer-Encoding': 'chunked'
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });

                const publicUrl = `${window.location.origin}/api/pptx/serve-powerpoint?id=${response.data.id}`;
                setPptxUrl(publicUrl);
                setViewerKey(prev => prev + 1);
            } catch (error) {
                console.error('Error in PowerPoint generation:', error);
                setError(error instanceof Error ? error.message : 'Unknown error occurred');
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

                const response = await axios.get(`/api/pptx/serve-powerpoint?id=${id}&download=true`, {
                    responseType: 'blob',
                    timeout: 300000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });

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
            } catch (error) {
                console.error('Error downloading PowerPoint:', error);
                setError('Failed to download PowerPoint');
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
