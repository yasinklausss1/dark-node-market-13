import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Share2, Heart, ShoppingCart, Eye, MessageCircle, Coins } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { WatermarkedImage } from '@/components/ui/watermarked-image';
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
  return <Card className="group relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-[hsl(240,55%,25%)] border-[hsl(240,55%,30%)] hover:shadow-2xl" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={() => onProductClick(product)}>
      {/* Title Section */}
      <CardHeader className="pb-3 px-6 pt-6 text-center">
        <div className="relative">
          <CardTitle className="text-xl md:text-2xl font-bold text-white line-clamp-2">
            {product.title}
          </CardTitle>
          {/* SALE Badge */}
          {product.stock > 0 && product.stock <= 5 && (
            <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-[hsl(290,80%,65%)] to-[hsl(280,70%,60%)] text-white border-0 px-3 py-1 text-xs font-bold shadow-lg">
              SALE!
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Image Section with Carousel */}
      <div className="relative aspect-square overflow-hidden mx-4 mb-4 rounded-lg">
        {productImages.length > 0 ? productImages.length === 1 ?
      // Single image - no carousel needed
      <WatermarkedImage src={productImages[0]} alt={product.title} className={`w-full h-full object-cover ${isGuest ? 'blur-xl' : ''}`} onError={e => {
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
                  <CarouselPrevious className="left-2 bg-[hsl(240,55%,35%)] border-[hsl(240,55%,45%)] text-white hover:bg-[hsl(240,55%,40%)]" />
                  <CarouselNext className="right-2 bg-[hsl(240,55%,35%)] border-[hsl(240,55%,45%)] text-white hover:bg-[hsl(240,55%,40%)]" />
                </>}
            </Carousel> : <div className="w-full h-full bg-gradient-to-br from-[hsl(240,55%,20%)] to-[hsl(240,55%,30%)] flex items-center justify-center">
            <ShoppingCart className="h-16 w-16 text-white/30" />
          </div>}
        
        {isGuest && <div className="absolute inset-0 flex items-center justify-center bg-[hsl(240,55%,25%)]/90 backdrop-blur-sm">
            <div className="text-center p-4">
              <p className="text-sm font-semibold mb-2 text-white">Login to view</p>
              <a href="/auth?tab=signin" className="text-xs text-[hsl(290,80%,65%)] hover:underline">
                Sign in now
              </a>
            </div>
          </div>}

        {/* Stock Badge */}
        {product.stock === 0 && <div className="absolute top-3 left-3">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>}
      </div>

      <CardContent className="px-6 pb-6 text-center space-y-4">
        {/* Delivery Info */}
        <p className="text-white/90 text-sm">
          Average Delivery: 3 days
        </p>

        {/* Price Section */}
        <div className="space-y-1">
          <p className="text-white/80 text-sm">
            Starting from:
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold text-[hsl(45,100%,60%)]">
              💳 {product.price} Credits
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Button onClick={handleAddToCart} className="w-full bg-gradient-to-r from-[hsl(290,80%,65%)] to-[hsl(280,70%,60%)] hover:from-[hsl(290,80%,60%)] hover:to-[hsl(280,70%,55%)] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg font-semibold" disabled={product.stock === 0 || isOwner || isGuest}>
          {isGuest ? 'Login to Purchase' : isOwner ? 'Your Product' : product.stock === 0 ? 'Out of Stock' : 'More Info'}
        </Button>
      </CardContent>
    </Card>;
};