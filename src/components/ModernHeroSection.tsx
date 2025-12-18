import React from 'react';
import { Users, Shield, TrendingUp } from 'lucide-react';
import { OracleLogo } from './OracleLogo';

interface ModernHeroSectionProps {
  userCount: number;
  onScrollToProducts: () => void;
}

export const ModernHeroSection: React.FC<ModernHeroSectionProps> = ({
  userCount,
  onScrollToProducts
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card mb-8">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      
      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.015] bg-noise" />

      <div className="relative z-10 p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: Title and Description */}
          <div className="space-y-3">
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

          {/* Right: Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-background/60 border border-border/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{userCount}</p>
                <p className="text-xs text-muted-foreground">Nutzer</p>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-lg bg-background/60 border border-border/50">
              <div className="p-2 rounded-full bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">100%</p>
                <p className="text-xs text-muted-foreground">Escrow</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
};
