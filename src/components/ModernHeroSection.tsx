import React from 'react';
import { OracleLogo } from './OracleLogo';

interface ModernHeroSectionProps {
  userCount?: number;
  onScrollToProducts?: () => void;
}

export const ModernHeroSection: React.FC<ModernHeroSectionProps> = () => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card mb-8">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.015] bg-noise" />

      <div className="relative z-10 p-6 md:p-10">
        <div className="flex items-center gap-3">
          <OracleLogo size="md" showText={false} />
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground tracking-tight">
              Oracle Market
            </h1>
            <p className="text-sm text-muted-foreground">
              Sicher. Anonym. Zuverlässig.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
};
