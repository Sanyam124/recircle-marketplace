'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'square' | 'ribbon';
  opacity: number;
}

interface CommunityJoinCelebrationProps {
  communityNames: string[];
  onComplete: () => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#FB923C', '#34D399', '#F472B6', '#60A5FA', '#FCD34D', '#C084FC'];
const DURATION = 5000;

export default function CommunityJoinCelebration({ communityNames, onComplete }: CommunityJoinCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const router = useRouter();

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 150; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 40,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 10,
        speedX: (Math.random() - 0.5) * 3,
        speedY: 1.5 + Math.random() * 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        shape: (['circle', 'square', 'ribbon'] as const)[Math.floor(Math.random() * 3)],
        opacity: 0.7 + Math.random() * 0.3,
      });
    }
    return newParticles;
  }, []);

  useEffect(() => {
    setParticles(createParticles());
    setTimeout(() => setShowContent(true), 300);

    // Add burst particles at intervals
    const burstInterval = setInterval(() => {
      setParticles(prev => [...prev.slice(-200), ...createParticles().slice(0, 50)]);
    }, 1200);

    const fadeTimer = setTimeout(() => setFadeOut(true), DURATION - 800);
    const completeTimer = setTimeout(() => {
      onComplete();
      router.push('/explore');
    }, DURATION);

    return () => {
      clearInterval(burstInterval);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [createParticles, onComplete, router]);

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.speedX * 0.3,
          y: p.y + p.speedY * 0.3,
          rotation: p.rotation + p.rotationSpeed,
          speedX: p.speedX + (Math.random() - 0.5) * 0.2,
          opacity: p.y > 90 ? Math.max(0, p.opacity - 0.05) : p.opacity,
        })).filter(p => p.y < 110 && p.opacity > 0)
      );
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[99999] pointer-events-auto transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.95) 0%, rgba(30,27,75,0.98) 100%)' }}
    >
      {/* Confetti Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.shape === 'ribbon' ? `${p.size * 0.4}px` : `${p.size}px`,
              height: p.shape === 'ribbon' ? `${p.size * 2.5}px` : `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'ribbon' ? '2px' : '2px',
              transform: `rotate(${p.rotation}deg)`,
              opacity: p.opacity,
              boxShadow: `0 0 ${p.size}px ${p.color}40`,
              transition: 'none',
            }}
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
          {/* Rings */}
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
              style={{ animationDelay: `${i * 200}ms` }}
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
