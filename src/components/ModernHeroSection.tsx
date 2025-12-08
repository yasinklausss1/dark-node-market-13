import React from 'react';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';

interface ModernHeroSectionProps {
  userCount: number;
  onScrollToProducts: () => void;
}

export const ModernHeroSection: React.FC<ModernHeroSectionProps> = ({
  userCount,
  onScrollToProducts
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 rounded-xl p-6 md:p-8 mb-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10">
        {/* Main Hero Content */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold font-cinzel bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-4">
            Oracle Market
          </h1>

          <p className="text-sm md:text-base text-muted-foreground">
            Sicherer Krypto-Marktplatz mit Bitcoin & Litecoin
          </p>
        </div>
      </div>
    </div>
  );
};