import { useState, useEffect } from "react";
import Head from "next/head";
import { Header } from "@components/layout/header";
import { PageContainer } from "@components/layout/page-container";
import { Footer } from "@components/layout/footer";
import { Button } from "@components/layout/button";
import { toast } from "react-hot-toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { getNFTs, NFT } from "@utils/fetchNfts";

const AiNFT = () => {
    const [walletAddress, setWalletAddress] = useState("");
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
    const [buttonState, setButtonState] = useState<"initial" | "loading" | "success" | "error">("initial");
    const [prompt, setPrompt] = useState("");
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [isCustomGeneration, setIsCustomGeneration] = useState(false);
    const { publicKey, connected } = useWallet();

    // Update wallet address when wallet is connected
    useEffect(() => {
        if (publicKey) {
            setWalletAddress(publicKey.toString());
        }
    }, [publicKey]);

    const handleFetchNFTs = async () => {
        if (!walletAddress) {
            toast.error("Please enter a wallet address");
            return;
        }

        setButtonState("loading");
        setLoading(true);

        try {
            const data = await getNFTs(walletAddress);
            setNfts(data);

            if (data.length === 0) {
                toast.error("No NFTs found for this wallet address");
                setButtonState("error");
            } else {
                toast.success(`Found ${data.length} NFTs`);
                setButtonState("success");
            }
        } catch (error) {
            console.error("Error fetching NFTs:", error);
            toast.error("Failed to fetch NFTs. Please try again later.");
            setButtonState("error");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectNFT = (nft: NFT) => {
        setSelectedNFT(nft);
        toast.success(`Selected: ${nft.content.metadata.name}`);
    };

    const handleGenerateVariation = async () => {
        if (!selectedNFT) {
            toast.error("Please select an NFT first");
            return;
        }

        if (!prompt.trim()) {
            toast.error("Please enter a prompt describing how you want to modify the NFT");
            return;
        }

        setGeneratingImage(true);
        try {
            const response = await fetch("/api/ai-nft/generate-variation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    imageUrl: selectedNFT.content.links.image,
                    nftName: selectedNFT.content.metadata.name,
                    attributes: selectedNFT.content.metadata.attributes,
                    prompt: prompt.trim(),
                    isCustomGeneration
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate image variation");
            }

            const data = await response.json();
            setGeneratedImage(data.imageUrl);
            toast.success("Image variation generated successfully!");
        } catch (error) {
            console.error("Error generating image variation:", error);
            toast.error("Failed to generate image variation");
        } finally {
            setGeneratingImage(false);
        }
    };

    return (
        <>
            <Head>
                <title>AI NFT Selector | Soltrendio</title>
                <meta name="description" content="Select an NFT from your wallet for AI analysis" />
            </Head>

            <PageContainer>
                <Header />

                <div className="flex flex-col items-center justify-center py-12">
                    <h1 className="text-4xl font-bold mb-8 text-white">AI NFT Selector</h1>

                    <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-lg mb-8">
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <label htmlFor="wallet-address" className="block text-lg font-medium text-white">
                                    Wallet Address
                                </label>
                            </div>

                            <input
                                id="wallet-address"
                                type="text"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                placeholder="e.g., 0x1234...5678"
                                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                disabled={connected}
                            />
                        </div>

                        <Button
                            state={buttonState}
                            onClick={handleFetchNFTs}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                        >
                            {connected ? "Fetch My NFTs" : "Fetch NFTs"}
                        </Button>
                    </div>

                    {loading && (
                        <div className="flex justify-center items-center mb-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                        </div>
                    )}

                    {nfts.length > 0 && (
                        <div className="w-full max-w-6xl">
                            <h2 className="text-2xl font-bold mb-6 text-white">Your NFTs</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {nfts.map((nft) => (
                                    <div
                                        key={nft.id}
                                        className={`bg-white/10 backdrop-blur-md rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer ${selectedNFT?.id === nft.id ? 'ring-2 ring-purple-500' : ''
                                            }`}
                                        onClick={() => handleSelectNFT(nft)}
                                    >
                                        <div className="aspect-square overflow-hidden">
                                            <img
                                                src={nft.content.links.image}
                                                alt={nft.content.metadata.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=NFT+Image';
                                                }}
                                            />
                                        </div>

                                        <div className="p-4">
                                            <h3 className="text-xl font-bold text-white mb-1 truncate">
                                                {nft.content.metadata.name}
                                            </h3>
                                            <p className="text-white/70 text-sm mb-2">
                                                {nft.grouping[0]?.collection_metadata.name || 'Unknown Collection'}
                                            </p>
                                            <p className="text-white/60 text-xs line-clamp-2">
                                                {nft.content.metadata.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedNFT && (
                        <div className="w-full max-w-2xl mt-12 bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-lg">
                            <h2 className="text-2xl font-bold mb-4 text-white">Selected NFT</h2>

                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-full md:w-1/2">
                                    <img
                                        src={selectedNFT.content.links.image}
                                        alt={selectedNFT.content.metadata.name}
                                        className="w-full h-auto rounded-lg"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=NFT+Image';
                                        }}
                                    />
                                </div>

                                <div className="w-full md:w-1/2">
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {selectedNFT.content.metadata.name}
                                    </h3>
                                    <p className="text-white/70 mb-4">
                                        {selectedNFT.grouping[0]?.collection_metadata.name || 'Unknown Collection'}
                                    </p>
                                    <p className="text-white/80 mb-4">
                                        {selectedNFT.content.metadata.description}
                                    </p>

                                    <div className="mb-4">
                                        <h4 className="text-lg font-semibold text-white mb-2">Attributes</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedNFT.content.metadata.attributes.map((attr, index) => (
                                                <div key={index} className="bg-white/20 rounded-lg p-2">
                                                    <p className="text-white/60 text-xs">{attr.trait_type}</p>
                                                    <p className="text-white font-medium">{attr.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="flex items-center space-x-2 text-white mb-4">
                                            <input
                                                type="checkbox"
                                                checked={isCustomGeneration}
                                                onChange={(e) => setIsCustomGeneration(e.target.checked)}
                                                className="form-checkbox h-5 w-5 text-purple-600"
                                            />
                                            <span>Generate custom image based on NFT attributes</span>
                                        </label>

                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder={isCustomGeneration 
                                                ? "Describe how you want to transform the NFT into a new image..."
                                                : "Describe how you want to transform the NFT into an action figure..."
                                            }
                                            className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                                        />
                                    </div>

                                    <Button
                                        state={generatingImage ? "loading" : "initial"}
                                        onClick={handleGenerateVariation}
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                                    >
                                        {generatingImage ? "Generating..." : "Generate Variation"}
                                    </Button>

                                    {generatedImage && (
                                        <div className="mt-6">
                                            <h4 className="text-lg font-semibold text-white mb-2">Generated Image</h4>
                                            <img
                                                src={generatedImage}
                                                alt="Generated variation"
                                                className="w-full h-auto rounded-lg"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Footer />
            </PageContainer>
        </>
    );
};

export default AiNFT;



