import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart } from 'lucide-react';

import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types/Product';

interface ProductCardProps {
  product: Product;
  sellerRating?: { average: number; total: number };
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onViewSeller: (sellerId: string) => void;
  onStartChat: (product: Product) => void;
  isOwner?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  sellerRating,
  onProductClick,
  onAddToCart,
  onViewSeller,
  onStartChat,
  isOwner = false
}) => {
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 cursor-pointer bg-card border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onProductClick(product)}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {product.image_url ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={product.image_url}
              alt={product.title}
              className={`w-full h-full object-cover transition-all duration-500 ${
                isHovered ? 'scale-105' : 'scale-100'
              } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          </>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Stock Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.stock === 0 && (
            <Badge variant="destructive" className="text-xs font-medium">
              Ausverkauft
            </Badge>
          )}
          
          {product.stock > 0 && product.stock <= 5 && (
            <Badge className="text-xs font-medium bg-primary/90 text-primary-foreground">
              Nur noch {product.stock}
            </Badge>
          )}
        </div>

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} />
      </div>

      {/* Content Section */}
      <CardHeader className="p-4 pb-2 space-y-1">
        <h3 className="font-medium text-sm line-clamp-2 leading-snug text-foreground group-hover:text-primary transition-colors">
          {product.title}
        </h3>
        
        {/* Seller Rating */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="h-3 w-3 text-primary fill-primary" />
          <span className="font-medium">
            {sellerRating 
              ? `${sellerRating.average.toFixed(1)}`
              : '0.0'}
          </span>
          <span className="text-muted-foreground/60">
            ({sellerRating?.total || 0})
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-foreground">
            €{product.price.toFixed(2)}
          </span>
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleAddToCart}
          className="w-full h-10 font-medium transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-gold"
          size="sm"
          disabled={product.stock === 0 || isOwner}
        >
          {isOwner 
            ? 'Dein Produkt' 
            : product.stock === 0 
              ? 'Ausverkauft' 
              : 'In den Warenkorb'}
        </Button>
      </CardContent>
    </Card>
  );
};
