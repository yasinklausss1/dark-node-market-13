import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Share2, Heart, ShoppingCart, Eye, MessageCircle, Bitcoin } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { WatermarkedImage } from '@/components/ui/watermarked-image';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types/Product';
import { supabase } from '@/integrations/supabase/client';
interface ProductCardProps {
  product: Product;
  sellerRating?: {
    average: number;
    total: number;
  };
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onViewSeller: (sellerId: string) => void;
  onStartChat: (product: Product) => void;
  isOwner?: boolean;
  isGuest?: boolean;
}
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  sellerRating,
  onProductClick,
  onAddToCart,
  onViewSeller,
  onStartChat,
  isOwner = false,
  isGuest = false
}) => {
  const {
    btcPrice,
    ltcPrice
  } = useCryptoPrices();
  const {
    toast
  } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);
  useEffect(() => {
    const fetchProductImages = async () => {
      const {
        data
      } = await supabase.from('product_images').select('image_url').eq('product_id', product.id).order('display_order', {
        ascending: true
      });
      if (data && data.length > 0) {
        setProductImages(data.map(img => img.image_url));
      } else if (product.image_url) {
        setProductImages([product.image_url]);
      }
    };
    fetchProductImages();
  }, [product.id, product.image_url]);
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
  return <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border-border/50 hover:border-primary/50" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={() => onProductClick(product)}>
      {/* Image Section with Carousel */}
      <div className="relative aspect-square overflow-hidden">
        {productImages.length > 0 ? productImages.length === 1 ?
      // Single image - no carousel needed
      <WatermarkedImage src={productImages[0]} alt={product.title} className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${isGuest ? 'blur-xl' : ''}`} onError={e => {
        e.currentTarget.style.display = 'none';
      }} onContextMenu={e => e.preventDefault()} draggable={false} /> :
      // Multiple images - show carousel
      <Carousel className="w-full h-full">
              <CarouselContent>
                {productImages.map((imageUrl, index) => <CarouselItem key={index}>
                    <WatermarkedImage src={imageUrl} alt={`${product.title} - Image ${index + 1}`} className={`w-full h-full object-cover ${isGuest ? 'blur-xl' : ''}`} onError={e => {
              e.currentTarget.style.display = 'none';
            }} onContextMenu={e => e.preventDefault()} draggable={false} />
                  </CarouselItem>)}
              </CarouselContent>
              {!isGuest && <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>}
            </Carousel> : <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/50" />
          </div>}
        
        {isGuest && <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center p-4">
              <p className="text-sm font-semibold mb-2">Login to view</p>
              <a href="/auth?tab=signin" className="text-xs text-primary hover:underline">
                Sign in now
              </a>
            </div>
          </div>}

        {/* Stock Badge */}
        {product.stock === 0 && <div className="absolute top-3 left-3">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>}
        
        {product.stock > 0 && product.stock <= 5 && <div className="absolute top-3 left-3">
            <Badge variant="secondary">Low Stock</Badge>
          </div>}

        {/* Image count indicator */}
        {productImages.length > 1 && !isGuest && <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
            {productImages.length} Bilder
          </div>}
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
        
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {/* Price Section */}
        <div className="space-y-3">
          <div className="text-xl font-bold text-primary">
            €{product.price.toFixed(2)}
          </div>
          

          {/* Stock Info */}
          

          {/* Action Button */}
          <Button onClick={handleAddToCart} className="w-full mt-3 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-md hover:shadow-lg transition-all duration-300" size="sm" disabled={product.stock === 0 || isOwner || isGuest}>
            {isGuest ? 'Login to Purchase' : isOwner ? 'Your Product' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </CardContent>
    </Card>;
};