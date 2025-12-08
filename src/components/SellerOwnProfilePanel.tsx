import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Star, 
  User, 
  Calendar, 
  Package, 
  ShoppingBag, 
  TrendingUp,
  MessageCircle,
  Award,
  BarChart3,
  Clock,
  Camera,
  Loader2
} from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
}

interface SellerRating {
  total_reviews: number;
  average_rating: number;
}

interface SellerStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface ProfileData {
  is_verified: boolean;
  created_at: string;
  profile_picture_url: string | null;
}

const SellerOwnProfilePanel: React.FC = () => {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerRating, setSellerRating] = useState<SellerRating | null>(null);
  const [stats, setStats] = useState<SellerStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [memberSince, setMemberSince] = useState<string>('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Fetch profile details including verification status and picture
      const { data: profileDetails } = await supabase
        .from('profiles')
        .select('is_verified, created_at, profile_picture_url')
        .eq('user_id', user.id)
        .single();
      
      if (profileDetails) {
        setProfileData(profileDetails);
        setMemberSince(new Date(profileDetails.created_at).toLocaleDateString('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }));
      }

      // Fetch seller rating
      const { data: ratingData } = await supabase
        .from('seller_ratings')
        .select('total_reviews, average_rating')
        .eq('seller_id', user.id)
        .single();
      
      setSellerRating(ratingData || { total_reviews: 0, average_rating: 0 });

      // Fetch recent reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setReviews(reviewsData || []);

      // Fetch products stats
      const { data: productsData } = await supabase
        .from('products')
        .select('id, is_active')
        .eq('seller_id', user.id);

      const totalProducts = productsData?.length || 0;
      const activeProducts = productsData?.filter(p => p.is_active).length || 0;

      // Fetch orders stats using the seller orders function
      const { data: ordersData } = await supabase
        .rpc('get_seller_orders', { seller_uuid: user.id });

      const totalOrders = ordersData?.length || 0;
      const totalRevenue = ordersData?.reduce((sum: number, order: any) => sum + (order.total_amount_eur || 0), 0) || 0;

      setStats({
        totalProducts,
        activeProducts,
        totalOrders,
        totalRevenue
      });

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wähle ein Bild aus');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Das Bild darf maximal 5MB groß sein');
      return;
    }

    setIsUploading(true);

    try {
      // Delete old profile picture if exists
      if (profileData?.profile_picture_url) {
        const oldPath = profileData.profile_picture_url.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-pictures').remove([oldPath]);
      }

      // Upload new picture
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update profile with new picture URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfileData(prev => prev ? { ...prev, profile_picture_url: publicUrl } : null);
      toast.success('Profilbild erfolgreich aktualisiert');

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error('Fehler beim Hochladen des Profilbilds');
    } finally {
      setIsUploading(false);
    }
  };

  const renderStars = (rating: number, size: string = 'h-5 w-5') => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar with Upload */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/30 bg-muted">
                {profileData?.profile_picture_url ? (
                  <img 
                    src={profileData.profile_picture_url} 
                    alt="Profilbild"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <User className="h-14 w-14 text-primary" />
                  </div>
                )}
              </div>
              
              {/* Upload Overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </div>
            
            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <h2 className="text-2xl font-bold">@{profile?.username}</h2>
                {profileData?.is_verified && (
                  <Badge className="w-fit bg-green-500 hover:bg-green-600">
                    <Award className="h-3 w-3 mr-1" />
                    Verifiziert
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Mitglied seit {memberSince}</span>
              </div>

              {/* Rating Display */}
              {sellerRating && sellerRating.total_reviews > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  {renderStars(Math.round(sellerRating.average_rating))}
                  <span className="text-xl font-bold">{sellerRating.average_rating.toFixed(1)}</span>
                  <Badge variant="secondary">
                    {sellerRating.total_reviews} Bewertung{sellerRating.total_reviews !== 1 ? 'en' : ''}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({getRatingText(sellerRating.average_rating)})
                  </span>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Noch keine Bewertungen erhalten</p>
              )}

              <p className="text-xs text-muted-foreground">
                Fahre mit der Maus über das Bild um ein neues Profilbild hochzuladen
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Package className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                <p className="text-xs text-muted-foreground">Produkte gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <ShoppingBag className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeProducts}</p>
                <p className="text-xs text-muted-foreground">Aktive Produkte</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <BarChart3 className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Verkäufe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{stats.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Umsatz</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Breakdown & Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Bewertungsübersicht
            </CardTitle>
            <CardDescription>
              So bewerten dich deine Käufer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sellerRating && sellerRating.total_reviews > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary">
                      {sellerRating.average_rating.toFixed(1)}
                    </div>
                    <div className="mt-2">
                      {renderStars(Math.round(sellerRating.average_rating), 'h-6 w-6')}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      basierend auf {sellerRating.total_reviews} Bewertung{sellerRating.total_reviews !== 1 ? 'en' : ''}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-center">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {getRatingText(sellerRating.average_rating)}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Noch keine Bewertungen vorhanden
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Bewertungen erscheinen hier, nachdem Käufer ihre Bestellungen erhalten haben
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Letzte Bewertungen
            </CardTitle>
            <CardDescription>
              Die neuesten Bewertungen deiner Käufer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {reviews.map((review) => (
                  <div key={review.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating, 'h-4 w-4')}
                        <Badge variant="outline" className="text-xs">
                          {review.rating}/5
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(review.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground italic">
                        "{review.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Noch keine Bewertungen vorhanden
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerOwnProfilePanel;