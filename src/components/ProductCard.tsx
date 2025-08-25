import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Share2, Heart, ShoppingCart, Eye, MessageCircle, Bitcoin } from 'lucide-react';

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
  const { btcPrice, ltcPrice } = useCryptoPrices();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);


  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const productUrl = `${window.location.origin}/marketplace?product=${product.id}`;
    const text = `🛍️ Check out this product: ${product.title} - €${product.price.toFixed(2)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  const handleViewSeller = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewSeller(product.seller_id);
  };

  const handleStartChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartChat(product);
  };

  return (
    <Card 
      className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border-border/50 hover:border-primary/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onProductClick(product)}
    >
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}

        {/* Stock Badge */}
        {product.stock === 0 && (
          <div className="absolute top-3 left-3">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
        
        {product.stock > 0 && product.stock <= 5 && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary">Low Stock</Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm md:text-base line-clamp-2 flex-1">
            {product.title}
          </CardTitle>
          <Badge variant="outline" className="text-xs shrink-0">
            {product.category}
          </Badge>
        </div>
        
        {/* Seller Rating */}
        <div className="flex items-center text-xs text-muted-foreground">
          <Star className="h-3 w-3 text-primary mr-1 fill-current" />
          <span>
            {sellerRating 
              ? `${sellerRating.average.toFixed(1)} (${sellerRating.total})`
              : '0.0 (0)'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {/* Price Section */}
        <div className="space-y-3">
          <div className="text-xl font-bold text-primary">
            €{product.price.toFixed(2)}
          </div>
          

          {/* Stock Info */}
          <div className="text-xs text-muted-foreground">
            Stock: {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleAddToCart}
            className="w-full mt-3 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-md hover:shadow-lg transition-all duration-300"
            size="sm"
            disabled={product.stock === 0 || isOwner}
          >
            {isOwner 
              ? 'Your Product' 
              : product.stock === 0 
                ? 'Out of Stock' 
                : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};