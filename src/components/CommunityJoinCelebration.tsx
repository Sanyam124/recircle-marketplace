'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface CommunityJoinCelebrationProps {
  communityNames: string[];
  onComplete: () => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#FB923C', '#34D399'];
const DURATION = 5000;

export default function CommunityJoinCelebration({ communityNames, onComplete }: CommunityJoinCelebrationProps) {
  const [showContent, setShowContent] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Generate fewer confetti pieces (30 instead of 50) for better mobile performance
  const confetti = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      isRibbon: Math.random() > 0.6,
      sway: (Math.random() - 0.5) * 60,
    }));
  }, []);

  useEffect(() => {
    const showTimer = setTimeout(() => setShowContent(true), 100);
    const fadeTimer = setTimeout(() => setFadeOut(true), DURATION - 700);
    const completeTimer = setTimeout(onComplete, DURATION);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[99999] pointer-events-auto transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'rgba(30,27,75,0.96)' }} // Simplified background (less expensive than radial gradient with blur)
    >
      {/* Optimized Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map(p => (
          <div
            key={p.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${p.left}%`,
              top: '-10%',
              width: p.isRibbon ? `${p.size * 0.4}px` : `${p.size}px`,
              height: p.isRibbon ? `${p.size * 2}px` : `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.isRibbon ? '1px' : '50%',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--sway': `${p.sway}px`,
              opacity: 0.8,
              willChange: 'transform', // Performance hint
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Central Content */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-500 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl animate-bounce">
            <span className="text-5xl">🎉</span>
          </div>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white text-center mb-3 tracking-tighter italic uppercase">
          Welcome to the Circle!
        </h1>

        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {communityNames.map((name, i) => (
            <div
              key={i}
              className="px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-white font-black text-sm uppercase tracking-widest"
            >
              {name}
            </div>
          ))}
        </div>

        <p className="text-indigo-200 text-center text-sm max-w-xs leading-relaxed font-bold uppercase tracking-tight">
          Your campus community has been <span className="text-yellow-400 font-black">automatically verified!</span>
        </p>

        {/* Feature Pills */}
        <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-sm opacity-80">
          {['Hostel Filters', 'Campus-Only Feed', 'Circle Board'].map((f, i) => (
            <span key={i} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/70 border border-white/10">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
