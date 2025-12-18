import React from 'react';
import { cn } from '@/lib/utils';

interface OracleLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  animate?: boolean;
}

const sizeMap = {
  sm: { icon: 32, text: 'text-lg' },
  md: { icon: 48, text: 'text-xl' },
  lg: { icon: 64, text: 'text-2xl' },
  xl: { icon: 96, text: 'text-4xl' },
};

export const OracleLogo: React.FC<OracleLogoProps> = ({
  size = 'md',
  showText = true,
  className,
  animate = false,
}) => {
  const { icon, text } = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Oracle Eye SVG */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          'text-primary transition-all duration-300',
          animate && 'animate-glow'
        )}
      >
        {/* Outer eye shape */}
        <path
          d="M32 12C18 12 8 32 8 32C8 32 18 52 32 52C46 52 56 32 56 32C56 32 46 12 32 12Z"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />

        {/* Inner circle - iris */}
        <circle
          cx="32"
          cy="32"
          r="12"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />

        {/* Center dot - pupil */}
        <circle cx="32" cy="32" r="5" fill="currentColor" opacity="0.95" />

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
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            'font-display font-semibold tracking-wider text-foreground',
            text
          )}>
            ORACLE
          </span>
          <span className={cn(
            'font-body text-primary tracking-[0.3em] uppercase -mt-1',
            size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-sm'
          )}>
            MARKET
          </span>
        </div>
      )}
    </div>
  );
};

export default OracleLogo;
