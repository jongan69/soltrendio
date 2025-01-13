import { Scraper, SearchMode } from 'agent-twitter-client'; // Replace with your actual scraper import

export class TwitterClient {
    private static instance: TwitterClient;
    private scraper: Scraper;
    private isInitialized: boolean = false;

    private constructor() {
        this.scraper = new Scraper();
    }

    public static getInstance(): TwitterClient {
        if (!TwitterClient.instance) {
            TwitterClient.instance = new TwitterClient();
        }
        return TwitterClient.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD) {
            throw new Error('Twitter credentials not configured');
        }

        try {
            const cookies = await this.scraper.getCookies();
            const isLoggedIn = await this.scraper.isLoggedIn();
            
            if (cookies && isLoggedIn) {
                await this.scraper.setCookies(cookies);
            } else {
                await this.scraper.login(process.env.TWITTER_USERNAME, process.env.TWITTER_PASSWORD);
            }
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Twitter client:', error);
            throw error;
        }
    }

    public async search(query: string) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        // Add your search implementation here
        return await this.scraper.fetchSearchTweets(query, 100, SearchMode.Latest);
    }

    // Add other methods as needed
    public async getUserProfile(username: string) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return await this.scraper.getProfile(username);
    }

    public async getUserTweets(username: string) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.scraper.getTweetsAndReplies(username);
    }

    public isReady(): boolean {
        return this.isInitialized;
    }
}
