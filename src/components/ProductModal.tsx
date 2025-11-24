import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Coins, ShoppingCart, User, Minus, Plus, MessageCircle, Share2 } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { WatermarkedImage } from '@/components/ui/watermarked-image';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TelegramIntegration } from '@/components/TelegramIntegration';
import { ProductAddonsSelection, AddonSelection } from '@/components/ProductAddonsSelection';
import { useIsMobile } from '@/hooks/use-mobile';
interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  seller_id: string;
  stock: number;
}
interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartChat?: (product: Product) => void;
}
const ProductModal: React.FC<ProductModalProps> = ({
  product,
  open,
  onOpenChange,
  onStartChat
}) => {
  const {
    addToCart
  } = useCart();
  const {
    user
  } = useAuth();
  const isGuest = !user;
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState<number>(1);
  const [sellerUsername, setSellerUsername] = useState<string>('');
  const [addonSelections, setAddonSelections] = useState<AddonSelection[]>([]);
  const [addonsTotalPrice, setAddonsTotalPrice] = useState(0);
  const [productImages, setProductImages] = useState<string[]>([]);
  useEffect(() => {
    if (product && open) {
      fetchSellerUsername();
      fetchProductImages();
      setQuantity(1);
    }
  }, [product, open]);
  const fetchSellerUsername = async () => {
    if (!product) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('username').eq('user_id', product.seller_id).single();
      if (error) {
        console.error('Error fetching seller username:', error);
        setSellerUsername('Unknown');
      } else {
        setSellerUsername(data?.username || 'Unknown');
      }
    } catch (error) {
      console.error('Error fetching seller username:', error);
      setSellerUsername('Unknown');
    }
  };
  
  const fetchProductImages = async () => {
    if (!product) return;
    const { data } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', product.id)
      .order('display_order', { ascending: true });
    
    if (data && data.length > 0) {
      setProductImages(data.map(img => img.image_url));
    } else if (product.image_url) {
      setProductImages([product.image_url]);
    }
  };
  const handleShare = () => {
    const productUrl = `${window.location.origin}/marketplace?product=${product.id}`;
    const text = `🛍️ Check out this product: ${product.title} - €${product.price.toFixed(2)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };
  if (!product) return null;
  const productContent = <div className="space-y-3 sm:space-y-6">
      {/* Product Images Carousel */}
      {productImages.length > 0 && (
        <div className="relative w-full h-48 sm:h-96 bg-gradient-to-br from-[hsl(240,45%,12%)] to-[hsl(240,45%,8%)] rounded-lg overflow-hidden border border-[hsl(240,40%,20%)]">
          {productImages.length === 1 ? (
            <WatermarkedImage 
              src={productImages[0]} 
              alt={product.title} 
              className={`w-full h-full object-contain pointer-events-none select-none ${isGuest ? 'blur-xl' : ''}`} 
              onError={e => {
                e.currentTarget.style.display = 'none';
              }} 
              onContextMenu={e => e.preventDefault()} 
              draggable={false} 
            />
          ) : (
            <Carousel className="w-full h-full">
              <CarouselContent>
                {productImages.map((imageUrl, index) => (
                  <CarouselItem key={index} className="flex items-center justify-center h-48 sm:h-96">
                    <WatermarkedImage 
                      src={imageUrl} 
                      alt={`${product.title} - Bild ${index + 1}`} 
                      className={`max-w-full max-h-full object-contain pointer-events-none select-none ${isGuest ? 'blur-xl' : ''}`}
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                      }} 
                      onContextMenu={e => e.preventDefault()} 
                      draggable={false} 
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {!isGuest && (
                <>
                  <CarouselPrevious className="left-2 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white hover:bg-[hsl(240,45%,20%)]" />
                  <CarouselNext className="right-2 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white hover:bg-[hsl(240,45%,20%)]" />
                  <div className="absolute bottom-3 right-3 bg-[hsl(240,45%,15%)]/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white border border-[hsl(240,40%,25%)]">
                    {productImages.length} Bilder
                  </div>
                </>
              )}
            </Carousel>
          )}
          {isGuest && (
            <div className="absolute inset-0 flex items-center justify-center bg-[hsl(240,45%,10%)]/95 backdrop-blur-sm">
              <div className="text-center p-4">
                <p className="text-sm font-semibold mb-2 text-white">Login to view</p>
                <a href="/auth?tab=signin" className="text-xs text-[hsl(280,80%,70%)] hover:underline">
                  Sign in now
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Badge className="w-fit bg-gradient-to-r from-[hsl(280,70%,60%)] to-[hsl(270,70%,55%)] text-white border-0 shadow-md">{product.category}</Badge>
          <div className="flex items-center space-x-1 text-xs sm:text-sm text-[hsl(240,30%,75%)]">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Seller: {sellerUsername}</span>
          </div>
        </div>

        <div className="space-y-1 sm:space-y-2 p-4 bg-gradient-to-br from-[hsl(240,45%,12%)] to-[hsl(240,45%,10%)] rounded-lg border border-[hsl(240,40%,20%)]">
          <div className="flex items-center gap-2">
            <Coins className="h-7 w-7 sm:h-8 sm:w-8 text-[hsl(45,100%,65%)]" />
            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[hsl(45,100%,65%)] to-[hsl(40,100%,60%)] bg-clip-text text-transparent">
              {(product.price * quantity + addonsTotalPrice)} Credits
            </span>
          </div>
          <p className="text-[hsl(240,30%,70%)] text-sm">
            ≈ {(product.price * quantity + addonsTotalPrice)}€
          </p>
        </div>

        <div className="bg-[hsl(240,45%,12%)] p-4 rounded-lg border border-[hsl(240,40%,20%)]">
          <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">Description</h3>
          <p className="text-[hsl(240,30%,75%)] text-sm sm:text-base leading-relaxed">
            {product.description || 'No description available.'}
          </p>
        </div>

        <Separator className="bg-[hsl(240,40%,20%)]" />

        {/* Quantity */}
        <div className="flex items-center gap-3 bg-[hsl(240,45%,12%)] p-3 rounded-lg border border-[hsl(240,40%,20%)]">
          <span className="text-sm text-white font-medium">Quantity</span>
          <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease quantity" className="h-9 w-9 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white hover:bg-[hsl(240,45%,20%)] hover:border-[hsl(280,70%,55%)] transition-all">
            <Minus className="h-4 w-4" />
          </Button>
          <Input type="number" min={1} max={product.stock ?? 99} value={quantity} onChange={e => {
          const val = Number(e.target.value);
          if (Number.isNaN(val)) return;
          setQuantity(Math.max(1, Math.min(val, product.stock ?? 99)));
        }} className="w-16 sm:w-20 text-center h-9 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white font-bold text-lg" />
          <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.min(product.stock ?? 99, q + 1))} aria-label="Increase quantity" className="h-9 w-9 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white hover:bg-[hsl(240,45%,20%)] hover:border-[hsl(280,70%,55%)] transition-all">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Product Add-ons Selection */}
        <ProductAddonsSelection 
          productId={product.id}
          onSelectionsChange={(selections, totalPrice) => {
            setAddonSelections(selections);
            setAddonsTotalPrice(totalPrice);
          }}
        />

        {/* Telegram Integration */}
        <Separator className="bg-[hsl(240,40%,20%)]" />
        <div>
          
          <TelegramIntegration productId={product.id} productTitle={product.title} productPrice={product.price} productImage={product.image_url} sellerUsername={sellerUsername} />
        </div>

        <Separator className="bg-[hsl(240,40%,20%)]" />

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          {/* Contact Seller Button - only show if not the owner and onStartChat is provided */}
          {user && product.seller_id !== user.id && onStartChat && (
            <Button 
              variant="outline" 
              onClick={() => onStartChat(product)} 
              className="w-full h-11 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white hover:bg-[hsl(240,45%,20%)] hover:border-[hsl(280,70%,55%)] transition-all"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span>Contact Seller</span>
            </Button>
          )}
          
          {/* Bottom Row - Back and Buy */}
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className={`${user && product.seller_id === user.id ? 'w-full' : 'flex-1'} h-12 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white hover:bg-[hsl(240,45%,20%)] hover:border-[hsl(240,40%,30%)] transition-all font-medium`}
            >
              Back
            </Button>
            
            {/* Only show Buy Now button if user is not the owner */}
            {(!user || product.seller_id !== user.id) && (
              <Button 
                className="flex-1 h-12 bg-gradient-to-r from-[hsl(280,70%,60%)] to-[hsl(270,70%,55%)] hover:from-[hsl(280,70%,65%)] hover:to-[hsl(270,70%,60%)] text-white border-0 shadow-lg hover:shadow-xl transition-all font-semibold" 
                disabled={product.stock === 0} 
                onClick={() => {
                  // Check if user is logged in
                  if (!user) {
                    toast({
                      title: "Login Required",
                      description: "Please sign in to add items to your cart.",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  addToCart({
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    category: product.category,
                    image_url: product.image_url
                  }, quantity);
                  toast({
                    title: "Added to Cart",
                    description: `${product.title} has been added to your cart.`
                  });
                  onOpenChange(false);
                }}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                <span>Buy Now</span>
              </Button>
            )}
          </div>
        </div>

        {/* Product Meta */}
        <div className="text-xs text-[hsl(240,30%,60%)] text-center pt-2">
          Added on: {new Date(product.created_at).toLocaleDateString('en-US')}
        </div>
      </div>
    </div>;
  if (isMobile) {
    return <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto bg-gradient-to-b from-[hsl(240,50%,8%)] to-[hsl(240,50%,6%)] border-[hsl(240,40%,20%)]">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center space-x-2 text-sm text-white">
              <ShoppingCart className="h-4 w-4" />
              <span className="line-clamp-2">{product.title}</span>
            </SheetTitle>
          </SheetHeader>
          {productContent}
        </SheetContent>
      </Sheet>;
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[95vh] overflow-y-auto sm:max-w-2xl w-[95vw] sm:w-full p-4 sm:p-6 bg-gradient-to-b from-[hsl(240,50%,8%)] to-[hsl(240,50%,6%)] border-[hsl(240,40%,20%)]">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg text-white">
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="line-clamp-2">{product.title}</span>
          </DialogTitle>
        </DialogHeader>
        {productContent}
      </DialogContent>
    </Dialog>;
};
export default ProductModal;