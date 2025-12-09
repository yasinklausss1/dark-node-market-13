-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_seller_orders(uuid);

-- Recreate get_seller_orders function with buyer_notes_images
CREATE FUNCTION public.get_seller_orders(seller_uuid uuid)
 RETURNS TABLE(id uuid, user_id uuid, total_amount_eur numeric, status text, created_at timestamp with time zone, shipping_first_name text, shipping_last_name text, shipping_street text, shipping_house_number text, shipping_postal_code text, shipping_city text, shipping_country text, buyer_username text, items jsonb, buyer_notes text, buyer_notes_images text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure caller is the seller themselves or an admin
  IF seller_uuid <> auth.uid() AND public.get_user_role(auth.uid()) <> 'admin'::user_role THEN
    RAISE EXCEPTION 'Not authorized to view these orders';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.user_id,
    o.total_amount_eur,
    o.status,
    o.created_at,
    o.shipping_first_name,
    o.shipping_last_name,
    o.shipping_street,
    o.shipping_house_number,
    o.shipping_postal_code,
    o.shipping_city,
    o.shipping_country,
    p.username AS buyer_username,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'order_item_id', oi.id,
        'quantity', oi.quantity,
        'price_eur', oi.price_eur,
        'product_title', pr.title,
        'product_type', pr.product_type,
        'digital_content', oi.digital_content,
        'digital_content_delivered_at', oi.digital_content_delivered_at,
        'digital_content_images', oi.digital_content_images
      ))
      FROM public.order_items oi
      JOIN public.products pr ON pr.id = oi.product_id
      WHERE oi.order_id = o.id AND pr.seller_id = seller_uuid
    ) AS items,
    o.buyer_notes,
    o.buyer_notes_images
  FROM public.orders o
  JOIN public.profiles p ON p.user_id = o.user_id
  WHERE EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products pr ON pr.id = oi.product_id
    WHERE oi.order_id = o.id AND pr.seller_id = seller_uuid
  )
  AND o.status = 'confirmed'
  ORDER BY o.created_at DESC;
END;
$function$;