'use client';

import { useState, useEffect } from 'react';

interface RateLimitScreenProps {
  onRetry: () => void;
  title?: string;
  message?: string;
}

export default function RateLimitScreen({ 
  onRetry, 
  title = "Whoa, slow down!", 
  message = "You're moving faster than we can keep up with. Please take a quick break before refreshing."
}: RateLimitScreenProps) {
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-in fade-in duration-500">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 inline-block max-w-lg border border-gray-100 dark:border-gray-700">
        <span className="text-6xl mb-6 block animate-bounce">🐢</span>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase italic tracking-tighter">{title}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">{message}</p>
        
        <div className="space-y-4">
          <button 
            onClick={() => {
              if (cooldown <= 0) {
                onRetry();
              }
            }} 
            disabled={cooldown > 0}
            className={`w-full py-3 px-8 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
              cooldown > 0 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {cooldown > 0 ? `Wait ${cooldown}s` : 'Try Again Now'}
          </button>
          
          {cooldown > 0 && (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest animate-pulse">
              Enforcing Cooldown to Prevent Spam
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
