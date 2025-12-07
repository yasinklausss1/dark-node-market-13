import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Bitcoin, ShoppingCart, User, Coins, Minus, Plus, MessageCircle, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { TelegramIntegration } from '@/components/TelegramIntegration';
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

const ProductModal: React.FC<ProductModalProps> = ({ product, open, onOpenChange, onStartChat }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { btcPrice, ltcPrice } = useCryptoPrices();
  const isMobile = useIsMobile();
  
  const [btcAmount, setBtcAmount] = useState<number | null>(null);
  const [ltcAmount, setLtcAmount] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [sellerUsername, setSellerUsername] = useState<string>('');

  useEffect(() => {
    if (product && open) {
      fetchSellerUsername();
      setQuantity(1);
    }
  }, [product, open]);

  useEffect(() => {
    if (product && btcPrice) setBtcAmount(product.price / btcPrice);
    if (product && ltcPrice) setLtcAmount(product.price / ltcPrice);
  }, [product, btcPrice, ltcPrice]);

  const fetchSellerUsername = async () => {
    if (!product) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', product.seller_id)
        .single();
      
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

  const handleShare = () => {
    const productUrl = `${window.location.origin}/marketplace?product=${product.id}`;
    const text = `🛍️ Check out this product: ${product.title} - €${product.price.toFixed(2)}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };


  if (!product) return null;

  const productContent = (
    <div className="space-y-3 sm:space-y-6">
      {/* Product Image */}
      {product.image_url && (
        <div className="w-full h-48 sm:h-64 bg-muted rounded-lg overflow-hidden">
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover pointer-events-none select-none"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        </div>
      )}

      {/* Product Info */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Badge variant="secondary" className="w-fit">{product.category}</Badge>
          <div className="flex items-center space-x-1 text-xs sm:text-sm text-muted-foreground">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Seller: {sellerUsername}</span>
          </div>
        </div>

        <div className="space-y-1 sm:space-y-2">
          <div className="text-xl sm:text-2xl font-bold text-primary">
            €{product.price.toFixed(2)}
          </div>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
            {btcPrice && btcAmount && (
              <div className="flex items-center text-sm sm:text-lg text-orange-500">
                <Bitcoin className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span>₿{btcAmount.toFixed(8)}</span>
              </div>
            )}
            {ltcPrice && ltcAmount && (
              <div className="flex items-center text-sm sm:text-lg text-blue-500">
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span>Ł{ltcAmount.toFixed(8)}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Description</h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            {product.description || 'No description available.'}
          </p>
        </div>

        <Separator />

        {/* Quantity */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Quantity</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Input
            type="number"
            min={1}
            max={product.stock ?? 99}
            value={quantity}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (Number.isNaN(val)) return;
              setQuantity(Math.max(1, Math.min(val, product.stock ?? 99)));
            }}
            className="w-16 sm:w-20 text-center h-8 sm:h-10"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity((q) => Math.min(product.stock ?? 99, q + 1))}
            aria-label="Increase quantity"
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* Telegram Integration */}
        <Separator />
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Share Product</h3>
          <TelegramIntegration
            productId={product.id}
            productTitle={product.title}
            productPrice={product.price}
            productImage={product.image_url}
            sellerUsername={sellerUsername}
          />
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          {/* Top Row - Share, Contact */}
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={handleShare}
              className="flex-1 h-10"
            >
              <Share2 className="h-4 w-4 mr-2" />
              <span className="text-sm">Share</span>
            </Button>
            
            {/* Contact Seller Button - only show if not the owner and onStartChat is provided */}
            {user && product.seller_id !== user.id && onStartChat && (
              <Button 
                variant="outline"
                onClick={() => onStartChat(product)}
                className="flex-1 h-10"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">Contact</span>
              </Button>
            )}
          </div>
          
          {/* Bottom Row - Back and Buy */}
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:flex-1 h-10"
            >
              Back
            </Button>
            <Button
              className="w-full sm:flex-1 h-10"
              disabled={product.stock === 0}
              onClick={() => {
                // Prevent purchasing own product if logged in
                if (user && product.seller_id === user.id) {
                  toast({
                    title: "Cannot Add to Cart",
                    description: "You cannot purchase your own product.",
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
              <ShoppingCart className="h-4 w-4 mr-2" />
              <span className="text-sm">Buy Now</span>
            </Button>
          </div>
        </div>

        {/* Product Meta */}
        <div className="text-xs text-muted-foreground">
          Added on: {new Date(product.created_at).toLocaleDateString('en-US')}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center space-x-2 text-sm">
              <ShoppingCart className="h-4 w-4" />
              <span className="line-clamp-2">{product.title}</span>
            </SheetTitle>
          </SheetHeader>
          {productContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[95vh] overflow-y-auto sm:max-w-2xl w-[95vw] sm:w-full p-3 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center space-x-2 text-sm sm:text-base">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="line-clamp-2">{product.title}</span>
          </DialogTitle>
        </DialogHeader>
        {productContent}
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;