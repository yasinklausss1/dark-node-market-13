import React, { useEffect, useState } from 'react';
import { OracleLogo } from './OracleLogo';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete, 
  duration = 2500 
}) => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    // Phase 1: Enter animation
    const enterTimer = setTimeout(() => {
      setPhase('show');
    }, 100);

    // Phase 2: Show for a moment
    const showTimer = setTimeout(() => {
      setPhase('exit');
    }, duration - 500);

    // Phase 3: Exit and complete
    const exitTimer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete, duration]);

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden",
      "transition-opacity duration-500",
      phase === 'exit' && "opacity-0"
    )}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Radial gradient glow */}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[600px] h-[600px] rounded-full",
          "bg-gradient-radial from-primary/20 via-primary/5 to-transparent",
          "transition-all duration-1000 ease-out",
          phase === 'enter' && "scale-0 opacity-0",
          phase === 'show' && "scale-100 opacity-100",
          phase === 'exit' && "scale-150 opacity-0"
        )} />
        
        {/* Animated rings */}
        {[1, 2, 3].map((ring) => (
          <div
            key={ring}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "rounded-full border border-primary/20",
              "transition-all ease-out",
              phase === 'enter' && "scale-0 opacity-0",
              phase === 'show' && "opacity-100",
              phase === 'exit' && "scale-150 opacity-0"
            )}
            style={{
              width: `${200 + ring * 100}px`,
              height: `${200 + ring * 100}px`,
              transitionDuration: `${800 + ring * 200}ms`,
              transitionDelay: phase === 'show' ? `${ring * 100}ms` : '0ms',
              transform: phase === 'show' 
                ? 'translate(-50%, -50%) scale(1)' 
                : phase === 'exit'
                ? 'translate(-50%, -50%) scale(1.5)'
                : 'translate(-50%, -50%) scale(0)',
            }}
          />
        ))}

        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-1 h-1 rounded-full bg-primary/40",
              "transition-all duration-1000",
              phase === 'enter' && "opacity-0",
              phase === 'show' && "opacity-100",
              phase === 'exit' && "opacity-0"
            )}
            style={{
              left: `${50 + Math.cos(i * 30 * Math.PI / 180) * 25}%`,
              top: `${50 + Math.sin(i * 30 * Math.PI / 180) * 25}%`,
              transitionDelay: `${i * 50}ms`,
              animation: phase === 'show' ? `float-particle ${3 + i % 2}s ease-in-out infinite` : 'none',
            }}
          />
        ))}
      </div>

      {/* Logo container */}
      <div className={cn(
        "relative z-10 flex flex-col items-center",
        "transition-all duration-700 ease-out",
        phase === 'enter' && "opacity-0 scale-75 translate-y-8",
        phase === 'show' && "opacity-100 scale-100 translate-y-0",
        phase === 'exit' && "opacity-0 scale-110 -translate-y-8"
      )}>
        {/* Glow effect behind logo */}
        <div className={cn(
          "absolute -inset-8 rounded-full blur-2xl",
          "bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30",
          "transition-opacity duration-500",
          phase === 'show' ? "opacity-100" : "opacity-0"
        )} />
        
        {/* The Oracle Logo */}
        <div className="relative">
          <OracleLogo size="xl" showText={true} animate={phase === 'show'} />
        </div>

        {/* Tagline */}
        <p className={cn(
          "mt-6 text-muted-foreground text-sm tracking-widest uppercase",
          "transition-all duration-500 delay-300",
          phase === 'enter' && "opacity-0 translate-y-4",
          phase === 'show' && "opacity-100 translate-y-0",
          phase === 'exit' && "opacity-0 -translate-y-4"
        )}>
          Secure Trading Platform
        </p>
      </div>

      {/* Bottom loading indicator */}
      <div className={cn(
        "absolute bottom-12 left-1/2 -translate-x-1/2",
        "transition-all duration-500 delay-500",
        phase === 'enter' && "opacity-0",
        phase === 'show' && "opacity-100",
        phase === 'exit' && "opacity-0"
      )}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <div
              key={dot}
              className="w-2 h-2 rounded-full bg-primary/60"
              style={{
                animation: phase === 'show' ? `pulse-dot 1.4s ease-in-out ${dot * 0.2}s infinite` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
