import React from 'react';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="footer footer-center p-4 text-base-content">
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-4">
          <a
            href="https://soltrendio.gitbook.io/soltrendio-docs"
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
            aria-label="Documentation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className="fill-current"
            >
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 12H7v-2h10v2zm0-4H7V9h10v2zm0-4H7V5h10v2z" />
            </svg>
          </a>
          <a
            href="https://magiceden.io/marketplace/trend_setters"
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
            aria-label="NFT Collection"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              className="fill-current"
            >
              <path d="M22 9v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9h20zm0-2H2V5c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v2zm-7 6H9v2h6v-2z"/>
            </svg>
          </a>
          <a
            href="https://dexscreener.com/solana/3butt85ousfqgsntfqpjmqltzxikepoakwapne8x14xu"
            target="_blank"
            rel="noreferrer"
            className="hover:opacity-70 transition-opacity"
            aria-label="Dexscreener"
          >
            <Image
              src="/dex.svg"
              width={20}
              height={20}
              alt="Pump.fun"
            />
          </a>
          {/* <a
            href="https://pump.fun/coin/BrhWtD6xw9kCf8HJycq91KbCaCAyLCQ3JDYN5QaQpump"
            target="_blank"
            rel="noreferrer"
            className="hover:opacity-70 transition-opacity"
            aria-label="Pump.fun"
          >
            <Image
              src="/pump.svg"
              width={20}
              height={20}
              alt="Pump.fun"
            />
          </a> */}
          <a
            href="https://app.meteora.ag/stake2earn/7VrKfJZ1D7B9ydmd8HXS76vX47A3rzKPDCok82SvFvRV"
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
            aria-label="Staking"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className="fill-current"
            >
              <path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
            </svg>
          </a>
          <a
            href="https://x.com/Soltrendio"
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
            aria-label="X (Twitter)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className="fill-current"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://t.me/soltrendioportal"
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
            aria-label="Telegram"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className="fill-current"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
