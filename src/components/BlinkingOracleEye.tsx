import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface BlinkingOracleEyeProps {
  size?: number;
  className?: string;
}

export const BlinkingOracleEye: React.FC<BlinkingOracleEyeProps> = ({
  size = 120,
  className,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 4000);

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary transition-all duration-300 animate-glow"
      >
        {/* Outer eye shape - animates during blink */}
        <path
          d={isBlinking 
            ? "M32 30C18 30 8 32 8 32C8 32 18 34 32 34C46 34 56 32 56 32C56 32 46 30 32 30Z"
            : "M32 12C18 12 8 32 8 32C8 32 18 52 32 52C46 52 56 32 56 32C56 32 46 12 32 12Z"
          }
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="transition-all duration-150 ease-in-out"
        />

        {/* Inner circle - iris (scales down during blink) */}
        <circle
          cx="32"
          cy="32"
          r={isBlinking ? 2 : 12}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="transition-all duration-150 ease-in-out"
        />

        {/* Center dot - pupil (scales down during blink) */}
        <circle 
          cx="32" 
          cy="32" 
          r={isBlinking ? 1 : 5} 
          fill="currentColor" 
          opacity={isBlinking ? 0 : 0.95}
          className="transition-all duration-150 ease-in-out"
        />

        {/* Top decorative arc */}
        <path
          d="M20 16C24 12 28 10 32 10C36 10 40 12 44 16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />

        {/* Bottom decorative arc */}
        <path
          d="M20 48C24 52 28 54 32 54C36 54 40 52 44 48"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />

        {/* Rays emanating from center */}
        <g opacity="0.35">
          <line x1="32" y1="2" x2="32" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="32" y1="56" x2="32" y2="62" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="2" y1="32" x2="6" y2="32" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <line x1="58" y1="32" x2="62" y2="32" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </g>

        {/* Eyelid overlay during blink */}
        {isBlinking && (
          <path
            d="M8 32C8 32 18 32 32 32C46 32 56 32 56 32"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
        )}
      </svg>
    </div>
  );
};

export default BlinkingOracleEye;
