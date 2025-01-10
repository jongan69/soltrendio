import React, { useState, useEffect } from 'react';
import Image from 'next/image';

function getTimeUntilNextFriday() {
  const now = new Date();
  const friday = new Date();

  // Set to next Friday
  friday.setDate(friday.getDate() + ((7 - friday.getDay() + 5) % 7));
  // Set to 12:00 PM
  friday.setHours(12, 0, 0, 0);

  // If it's already past Friday 12 PM, move to next Friday
  if (now > friday) {
    friday.setDate(friday.getDate() + 7);
  }

  const diff = friday.getTime() - now.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, total: diff };
}

export function Footer() {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilNextFriday());
  const [showCollection, setShowCollection] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = getTimeUntilNextFriday();
      setTimeLeft(newTime);

      // Switch to NFT Collection text when timer hits 0
      if (newTime.total <= 0) {
        setShowCollection(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="footer footer-center p-4 text-base-content">
      <div className="flex flex-col items-center gap-2">
        <p className="flex items-center gap-2">
          <a
            href="https://launchmynft.io/collections/4XkHKL3ErUuPBeDs9tnUZZ7as5EeeD9o3iLpbFGGiTP8/62N1lSAE9w5XVj9cuHWM"
            className="opacity-40 hover:opacity-100 transition-opacity text-xs text-black-400"
            target="_blank"
            rel="noreferrer"
          >
            {showCollection ? (
              '· NFT Collection ·'
            ) : (
              `· ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s ·`
            )}
          </a>
        </p>
        <div className="flex gap-4">
          <a
            href="https://doc.soltrendio.com/"
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
          </a>
          <a
            href="https://m3m3.meteora.ag/farms/7VrKfJZ1D7B9ydmd8HXS76vX47A3rzKPDCok82SvFvRV"
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
