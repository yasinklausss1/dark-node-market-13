import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Star, 
  User, 
  Calendar, 
  MessageCircle, 
  Package, 
  ShoppingBag, 
  Flag,
  Award,
  BarChart3,
  TrendingUp,
  Clock
} from 'lucide-react';
import ReportSellerModal from './ReportSellerModal';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_username?: string;
  product_title?: string;
}

interface SellerRating {
  total_reviews: number;
  average_rating: number;
}

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  image_url: string | null;
  stock: number;
  product_type: string;
}

interface SellerProfile {
  is_verified: boolean;
  created_at: string;
  profile_picture_url: string | null;
}

interface SellerStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface SellerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  sellerUsername: string;
  onProductClick?: (productId: string) => void;
}

const SellerProfileModal: React.FC<SellerProfileModalProps> = ({
  open,
  onOpenChange,
  sellerId,
  sellerUsername,
  onProductClick
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerRating, setSellerRating] = useState<SellerRating | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<SellerStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [memberSince, setMemberSince] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (open && sellerId) {
      fetchSellerData();
    }
  }, [open, sellerId]);

  const fetchSellerData = async () => {
    setIsLoading(true);
    try {
      // Fetch seller profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_verified, created_at, profile_picture_url')
        .eq('user_id', sellerId)
        .single();

      if (profileData) {
        setSellerProfile(profileData);
        setMemberSince(new Date(profileData.created_at).toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }));
      }

      // Fetch seller rating summary
      const { data: ratingData, error: ratingError } = await supabase
        .from('seller_ratings')
        .select('total_reviews, average_rating')
        .eq('seller_id', sellerId)
        .single();

      if (ratingError && ratingError.code !== 'PGRST116') {
        console.error('Error fetching seller rating:', ratingError);
      } else {
        setSellerRating(ratingData || { total_reviews: 0, average_rating: 0 });
      }

      // Fetch ALL reviews for this seller (with product and reviewer info)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id, product_id')
        .eq('seller_id', sellerId)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      } else if (reviewsData && reviewsData.length > 0) {
        // Fetch reviewer usernames
        const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', reviewerIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

        // Fetch product titles
        const productIds = [...new Set(reviewsData.filter(r => r.product_id).map(r => r.product_id))];
        const { data: productsInfo } = await supabase
          .from('products')
          .select('id, title')
          .in('id', productIds);
        const productMap = new Map(productsInfo?.map(p => [p.id, p.title]) || []);

        const enrichedReviews = reviewsData.map(r => ({
          ...r,
          reviewer_username: profileMap.get(r.reviewer_id) || 'Unbekannt',
          product_title: r.product_id ? productMap.get(r.product_id) : undefined
        }));
        
        setReviews(enrichedReviews);
      } else {
        setReviews([]);
      }

      // Fetch seller's active products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, title, price, category, image_url, stock, product_type, is_active')
        .eq('seller_id', sellerId);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      } else {
        const allProducts = productsData || [];
        const activeProducts = allProducts.filter(p => p.is_active);
        setProducts(activeProducts);
        
        setStats(prev => ({
          ...prev,
          totalProducts: allProducts.length,
          activeProducts: activeProducts.length
        }));
      }

      // Fetch orders count (using order_items to count seller's sales)
      const { data: orderItemsData } = await supabase
        .from('order_items')
        .select(`
          id,
          price_eur,
          quantity,
          product:products!inner(seller_id)
        `)
        .eq('product.seller_id', sellerId);

      if (orderItemsData) {
        const totalOrders = orderItemsData.length;
        const totalRevenue = orderItemsData.reduce((sum, item) => sum + (Number(item.price_eur) * item.quantity), 0);
        
        setStats(prev => ({
          ...prev,
          totalOrders,
          totalRevenue
        }));
      }

    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number, size: string = 'h-4 w-4') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return 'Ausgezeichnet';
    if (rating >= 4) return 'Sehr gut';
    if (rating >= 3.5) return 'Gut';
    if (rating >= 3) return 'Befriedigend';
    if (rating >= 2) return 'Ausreichend';
    return 'Keine Bewertung';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Verkäuferprofil</DialogTitle>
            {user && user.id !== sellerId && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setReportModalOpen(true)}
              >
                <Flag className="h-4 w-4 mr-1" />
                Melden
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Header - Instagram Style */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-primary/30 bg-muted flex-shrink-0">
                    {sellerProfile?.profile_picture_url ? (
                      <img 
                        src={sellerProfile.profile_picture_url} 
                        alt={`${sellerUsername} Profilbild`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <User className="h-12 w-12 text-primary" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <h2 className="text-2xl font-bold">@{sellerUsername}</h2>
                      {sellerProfile?.is_verified && (
                        <Badge className="w-fit mx-auto sm:mx-0 bg-green-500 hover:bg-green-600">
                          <Award className="h-3 w-3 mr-1" />
                          Verifiziert
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Mitglied seit {memberSince}</span>
                    </div>

                    {/* Rating Display */}
                    {sellerRating && sellerRating.total_reviews > 0 ? (
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                        {renderStars(Math.round(sellerRating.average_rating), 'h-5 w-5')}
                        <span className="text-xl font-bold">{sellerRating.average_rating.toFixed(1)}</span>
                        <Badge variant="secondary">
                          {sellerRating.total_reviews} Bewertung{sellerRating.total_reviews !== 1 ? 'en' : ''}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ({getRatingText(sellerRating.average_rating)})
                        </span>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Noch keine Bewertungen</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Package className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stats.totalProducts}</p>
                      <p className="text-xs text-muted-foreground">Produkte</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <ShoppingBag className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stats.activeProducts}</p>
                      <p className="text-xs text-muted-foreground">Aktiv</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <BarChart3 className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{stats.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">Verkäufe</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <TrendingUp className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">€{stats.totalRevenue.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">Umsatz</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Products & Reviews Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Products */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Produkte ({products.length})
                  </CardTitle>
                  <CardDescription>Aktive Produkte dieses Verkäufers</CardDescription>
                </CardHeader>
                <CardContent>
                  {products.length > 0 ? (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                      {products.map((product) => (
                        <div 
                          key={product.id} 
                          className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            if (onProductClick) {
                              onProductClick(product.id);
                              onOpenChange(false);
                            }
                          }}
                        >
                          <div className="w-14 h-14 flex-shrink-0 rounded overflow-hidden bg-muted">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{product.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                              {product.product_type === 'digital' && (
                                <Badge variant="secondary" className="text-xs">Digital</Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-sm font-bold text-primary">€{Number(product.price).toFixed(2)}</span>
                              <span className={`text-xs ${product.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {product.stock > 0 ? `${product.stock} verfügbar` : 'Ausverkauft'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Keine aktiven Produkte</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Alle Bewertungen ({reviews.length})
                  </CardTitle>
                  <CardDescription>Käuferbewertungen für diesen Verkäufer</CardDescription>
                </CardHeader>
                <CardContent>
                  {reviews.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {reviews.map((review) => (
                        <div key={review.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {renderStars(review.rating)}
                              <Badge variant="outline" className="text-xs">
                                {review.rating}/5
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(review.created_at).toLocaleDateString('de-DE')}
                            </div>
                          </div>
                          {review.product_title && (
                            <p className="text-xs font-medium text-primary">
                              Produkt: {review.product_title}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            @{review.reviewer_username}
                          </div>
                          {review.comment && (
                            <p className="text-sm text-foreground/80 italic border-l-2 border-primary/30 pl-2">
                              "{review.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Noch keine Bewertungen</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                Schließen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      <ReportSellerModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        sellerId={sellerId}
        sellerUsername={sellerUsername}
      />
    </Dialog>
  );
};

export default SellerProfileModal;