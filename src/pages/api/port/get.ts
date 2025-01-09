import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectDB';

interface PortfolioPerformance {
    thirtyMinutes: number;
    oneHour: number;
    sixHours: number;
    twentyFourHours: number;
    averageMarketCap: number;
}

async function getPortfolioPerformance(portfolioId: string): Promise<PortfolioPerformance | null> {
    try {
        const response = await fetch(
            `https://d3q4fpkflgd1hz.cloudfront.net//portfolios/performance/${portfolioId}`,
            {
                method: 'GET'
            }
        );

        console.log('Portfolio performance response:', response);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching portfolio performance:', error);
        return null;
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let client;
    try {
        // Connect to MongoDB
        client = await connectToDatabase();
        const db = client.db('walletAnalyzer');
        const portfoliosCollection = db.collection('portfolios');   

        // Add logging to debug
        const count = await portfoliosCollection.countDocuments();
        console.log(`Found ${count} portfolios in database`);

        // Get all portfolios from MongoDB
        const portfolios = await portfoliosCollection.find({}).toArray();
        console.log('Raw portfolios from DB:', portfolios);

        // Fetch performance data for each portfolio
        const portfoliosWithPerformance = await Promise.all(
            portfolios.map(async (portfolio) => {
                const performance = await getPortfolioPerformance(portfolio.portfolioId);
                console.log(`Performance for portfolio ${portfolio.portfolioId}:`, performance);

                return {
                    portfolio_name: portfolio.portfolioName,
                    portfolio_id: portfolio.portfolioId,
                    mint_addresses: portfolio.mintAddresses,
                    created_at: portfolio.createdAt,
                    performance: performance ? {
                        '30m': performance.thirtyMinutes || 0,
                        '1h': performance.oneHour || 0,
                        '6h': performance.sixHours || 0,
                        '24h': performance.twentyFourHours || 0,
                        'avg_market_cap': performance.averageMarketCap || 0
                    } : null
                };
            })
        );

        // Get top performers for each time frame
        const getTopPerformers = (timeFrame: '30m' | '1h' | '6h' | '24h') => {
            return portfoliosWithPerformance
                .filter(p => p.performance && p.performance[timeFrame] !== 0)
                .sort((a, b) => (b.performance?.[timeFrame] || 0) - (a.performance?.[timeFrame] || 0))
                .slice(0, 5); // Get top 5 performers
        };

        const topPerformers = {
            '30m': getTopPerformers('30m'),
            '1h': getTopPerformers('1h'),
            '6h': getTopPerformers('6h'),
            '24h': getTopPerformers('24h')
        };

        // Sort all portfolios by 24h performance for the complete list
        const sortedPortfolios = portfoliosWithPerformance
            .filter(p => p.performance && p.performance['24h'] !== 0)
            .sort((a, b) => (b.performance?.['24h'] || 0) - (a.performance?.['24h'] || 0));

        console.log('Final sorted portfolios:', sortedPortfolios);

        return res.status(200).json({
            portfolios: sortedPortfolios,
            topPerformers
        });

    } catch (error) {
        console.error('Error fetching portfolios:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching portfolios'
        });
    } finally {
        // Close the connection in the finally block
        if (client) {
            await client.close();
        }
    }
}
