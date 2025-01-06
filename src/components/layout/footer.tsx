import React, { useState, useEffect } from 'react';

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
          Soltrendio was faily launched on
          <a
            href="https://pump.fun/coin/BrhWtD6xw9kCf8HJycq91KbCaCAyLCQ3JDYN5QaQpump"
            target="_blank"
            rel="noreferrer"
            className="link link-primary"
          >
            Pump.fun 
          </a>
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
