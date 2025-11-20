import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Shield, Zap, Users, TrendingUp, Star } from 'lucide-react';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
interface ModernHeroSectionProps {
  userCount: number;
  onScrollToProducts: () => void;
}
export const ModernHeroSection: React.FC<ModernHeroSectionProps> = ({
  userCount,
  onScrollToProducts
}) => {
  const {
    btcPrice,
    ltcPrice
  } = useCryptoPrices();
  return <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 rounded-2xl p-8 mb-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-accent/20 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10">
        {/* Main Hero Content */}
        <div className="text-center max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="secondary" className="animate-fade-in">
              <Star className="h-3 w-3 mr-1" />
              Trusted Marketplace
            </Badge>
            <Badge variant="outline" className="animate-fade-in delay-100">










r
100+ user<Users className="h-3 w-3 mr-1" />
              300+ user
            </Badge>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold font-cinzel bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-6 animate-fade-in delay-200">
            Oracle Market
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in delay-300">
            Secure crypto marketplace with advanced verification, real-time chat, and instant transactions.       
          </p>

          
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          

          

        </div>

      </div>
    </div>;
};