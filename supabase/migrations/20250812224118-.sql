-- Fix function search path warnings by adding missing SET search_path
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.update_seller_ratings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Update seller ratings when review is inserted, updated, or deleted
    INSERT INTO public.seller_ratings (seller_id, total_reviews, average_rating, total_rating_points)
    SELECT 
        COALESCE(NEW.seller_id, OLD.seller_id) as seller_id,
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 2) as average_rating,
        SUM(rating) as total_rating_points
    FROM public.reviews 
    WHERE seller_id = COALESCE(NEW.seller_id, OLD.seller_id)
    GROUP BY seller_id
    ON CONFLICT (seller_id) 
    DO UPDATE SET 
        total_reviews = EXCLUDED.total_reviews,
        average_rating = EXCLUDED.average_rating,
        total_rating_points = EXCLUDED.total_rating_points,
        updated_at = now();
    
    -- If no reviews left, set to defaults
    IF NOT FOUND AND OLD.seller_id IS NOT NULL THEN
        INSERT INTO public.seller_ratings (seller_id, total_reviews, average_rating, total_rating_points)
        VALUES (OLD.seller_id, 0, 0.00, 0)
        ON CONFLICT (seller_id) 
        DO UPDATE SET 
            total_reviews = 0,
            average_rating = 0.00,
            total_rating_points = 0,
            updated_at = now();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$

CREATE OR REPLACE FUNCTION public.auto_deactivate_product_on_zero_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.stock = 0 AND OLD.stock > 0 THEN
    NEW.is_active = false;
  END IF;
  RETURN NEW;
END;
$function$