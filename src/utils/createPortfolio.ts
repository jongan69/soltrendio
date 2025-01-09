import { PublicKey } from "@solana/web3.js";
import { generatePortfolioName } from "./generatePortfolioName";

interface CreatePortfolioResponse {
    message: string;
    id: string;
}

export const createPortfolio = async (publicKey: PublicKey, topPumpTokens: any) => {
    try {
        const response = await fetch('/api/port/create', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            createdBy: publicKey?.toBase58(),
            portfolioName: generatePortfolioName(topPumpTokens),
            mintAddresses: topPumpTokens.map((token: any) => token.mintAddress),
            tokens: topPumpTokens
        })
    });
    const data: CreatePortfolioResponse = await response.json();
    return data;
    } catch (error) {
        console.error('Error creating portfolio:', error);
        throw new Error('Failed to create portfolio');
    }
}   