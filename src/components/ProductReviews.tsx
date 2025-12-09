import { useState, useEffect } from 'react';
import { Star, ChevronDown, ChevronUp, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_username: string;
}

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProductReviews();
  }, [productId]);

  const fetchProductReviews = async () => {
    try {
      // Fetch reviews specific to this product
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (reviewsData && reviewsData.length > 0) {
        // Fetch reviewer usernames
        const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', reviewerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) || []);

        const formattedReviews: Review[] = reviewsData.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment || '',
          created_at: review.created_at,
          reviewer_username: profileMap.get(review.reviewer_id) || 'Unbekannt'
        }));

        setReviews(formattedReviews);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return null;
  }

  if (reviews.length === 0) {
    return (
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-sm text-muted-foreground">
          Noch keine Bewertungen für dieses Produkt
        </p>
      </div>
    );
  }

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="border-t border-border pt-4 mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">Produktbewertungen</span>
          <span className="text-sm text-muted-foreground">
            ({reviews.length} {reviews.length === 1 ? 'Bewertung' : 'Bewertungen'})
          </span>
          <div className="flex items-center gap-1">
            {renderStars(Math.round(averageRating))}
            <span className="text-sm text-muted-foreground ml-1">
              {averageRating.toFixed(1)}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 max-h-64 overflow-y-auto">
          {reviews.map((review) => (
            <div key={review.id} className="border border-border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{review.reviewer_username}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(review.created_at), 'dd. MMM yyyy', { locale: de })}
                </span>
              </div>
              {renderStars(review.rating)}
              {review.comment && (
                <p className="text-sm mt-2 text-foreground/80">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
