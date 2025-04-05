import React from 'react';
import Link from 'next/link';

export const BreadsheetLink: React.FC = () => {
  return (
    <Link href="/breadsheet" className="block w-full">
      <div className="group relative w-full overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-1 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtMS4xIDAtMiAuOS0yIDJ2MjBjMCAxLjEuOSAyIDIgMmg0YzEuMSAwIDItLjkgMi0yVjIwYzAtMS4xLS45LTItMi0yaC00em0tMTIgMGMtMS4xIDAtMiAuOS0yIDJ2MjBjMCAxLjEuOSAyIDIgMmg0YzEuMSAwIDItLjkgMi0yVjIwYzAtMS4xLS45LTItMi0yaC00eiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwuMSkiLz48L2c+PC9zdmc+')] opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
        <div className="relative flex items-center justify-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white animate-pulse" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <span className="font-bold text-white text-base md:text-lg">BreadSheet</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-white/80 text-sm md:text-base">Create your own breadsheet</span>
          </div>
          <div className="ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </Link>
  );
}; 