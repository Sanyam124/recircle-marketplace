'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface CommunityJoinCelebrationProps {
  communityNames: string[];
  onComplete: () => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#FB923C', '#34D399', '#F472B6', '#60A5FA', '#FCD34D', '#C084FC'];
const DURATION = 5000;

export default function CommunityJoinCelebration({ communityNames, onComplete }: CommunityJoinCelebrationProps) {
  const [showContent, setShowContent] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Generate confetti pieces once (CSS-animated, no React re-renders)
  const confetti = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 2.5 + Math.random() * 2,
      color: COLORS[i % COLORS.length],
      size: 5 + Math.random() * 7,
      isRibbon: Math.random() > 0.5,
      sway: (Math.random() - 0.5) * 80,
    }));
  }, []);

  useEffect(() => {
    setTimeout(() => setShowContent(true), 200);
    const fadeTimer = setTimeout(() => setFadeOut(true), DURATION - 800);
    const completeTimer = setTimeout(onComplete, DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[99999] pointer-events-auto transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.95) 0%, rgba(30,27,75,0.98) 100%)' }}
    >
      {/* CSS-only confetti — no JS animation loop */}
      <div className="absolute inset-0 overflow-hidden">
        {confetti.map(p => (
          <div
            key={p.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${p.left}%`,
              top: '-5%',
              width: p.isRibbon ? `${p.size * 0.4}px` : `${p.size}px`,
              height: p.isRibbon ? `${p.size * 2.2}px` : `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.isRibbon ? '2px' : '50%',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--sway': `${p.sway}px`,
              opacity: 0.85,
              boxShadow: `0 0 ${p.size}px ${p.color}30`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Central Content */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-700 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
        {/* Celebration Icon */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 flex items-center justify-center shadow-2xl shadow-orange-500/40 animate-bounce">
            <span className="text-6xl">🎉</span>
          </div>
          <div className="absolute inset-0 w-28 h-28 rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute -inset-3 rounded-full border-2 border-yellow-400/30 animate-ping" style={{ animationDuration: '2s' }} />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black text-white text-center mb-3 drop-shadow-lg tracking-tight">
          Welcome to the Circle!
        </h1>

        {/* Community Names */}
        <div className="flex flex-wrap gap-3 justify-center mb-5">
          {communityNames.map((name, i) => (
            <div
              key={i}
              className="px-5 py-2.5 bg-white/15 backdrop-blur-xl rounded-2xl border border-white/25 text-white font-bold text-lg shadow-lg"
            >
              🏫 {name}
            </div>
          ))}
        </div>

        {/* Subtitle */}
        <p className="text-indigo-100 text-center text-lg max-w-md leading-relaxed font-medium">
          Your campus community has been <span className="text-yellow-300 font-black">automatically verified!</span>
        </p>

        {/* Unlocked Features */}
        <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-md">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 text-white/90 text-xs font-bold flex items-center gap-2">
            <span>🏠</span> Hostel & Building Filters
          </div>
          <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 text-white/90 text-xs font-bold flex items-center gap-2">
            <span>🔒</span> Campus-Only Listings
          </div>
          <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 text-white/90 text-xs font-bold flex items-center gap-2">
            <span>👥</span> Community Circle Board
          </div>
        </div>

        {/* Sparkle dots */}
        <div className="flex gap-2 mt-8">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
          ))}
        </div>
      </div>

      {/* Corner poppers */}
      <div className="absolute top-8 left-8 text-5xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎊</div>
      <div className="absolute top-8 right-8 text-5xl animate-bounce" style={{ animationDelay: '0.5s' }}>🎊</div>
      <div className="absolute bottom-8 left-8 text-4xl animate-bounce" style={{ animationDelay: '0.8s' }}>✨</div>
      <div className="absolute bottom-8 right-8 text-4xl animate-bounce" style={{ animationDelay: '1.1s' }}>✨</div>
    </div>
  );
}
