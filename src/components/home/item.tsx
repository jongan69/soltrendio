import { TokenData } from "@utils/tokenUtils"; // Import TokenData type from utils
import React, { useState, useEffect } from "react"; // Import React and necessary hooks

// Define ImageProps type for ImageComponent props
type ImageProps = {
  cid?: string | null; // Content identifier for IPFS
  logo: string | undefined; // Logo URL
  alt: string; // Alternative text for the image
};

// Default image URL if no image is provided
const DEFAULT_IMAGE_URL =
  process.env.UNKNOWN_IMAGE_URL ||
  "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

// ImageComponent definition
const ImageComponent = ({ cid, alt, logo }: ImageProps) => {
  const [src, setSrc] = useState<string>(DEFAULT_IMAGE_URL); // State for image source URL

  useEffect(() => {
    // Update image source URL based on cid or logo
    if (cid && !logo) {
      const imageUrl = `https://ipfs.io/ipfs/${cid}`;
      setSrc(imageUrl);
    } else if (logo) {
      setSrc(logo);
    }
  }, [cid, logo, alt]);

  // Handle image load error by setting default image URL
  const handleError = () => {
    setSrc(DEFAULT_IMAGE_URL);
  };

  return <img className="object-cover h-80 w-96 aspect-square" src={src} alt={alt} onError={handleError} />;
};

// Define ItemProps type for Item component props
type ItemProps = {
  data: TokenData; // Token data for the item
};

// Item component definition
export function Item({ data }: ItemProps) {
  const { 
    name, 
    symbol, 
    amount, 
    logo, 
    usdValue, 
    cid, 
    collectionName,
    collectionLogo,
    isNft
  } = data;

  // Determine card class based on usdValue and isNft properties
  const cardClass = `card shadow-xl bg-neutral text-neutral-content ${usdValue === 0 && amount > 0 || isNft && amount > 0 ? 'border-red-500 border-4' : ''}`;

  return (
    <div className={cardClass}>
      {logo && (
        <figure className="relative h-80">
          {/* Render ImageComponent with appropriate props */}
          <ImageComponent cid={cid} logo={logo ?? collectionLogo} alt={`Picture of ${name}`} />
        </figure>
      )}
      <div className="card-body p-4 items-center text-center">
        <h2 className="card-title m-0">{name}</h2>
        {isNft && <p>NFT Collection Name: {collectionName}</p>}
        <p>
          {symbol}: {Number(amount).toFixed(5)} (≈ ${usdValue})
        </p>
      </div>
    </div>
  );
}
