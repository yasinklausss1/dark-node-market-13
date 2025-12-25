-- Assign moderator role to user "vogue"
INSERT INTO public.user_roles (user_id, role)
VALUES ('5f33954d-dd90-497f-8bc8-2d7f1718c0bd', 'moderator')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update their profile role for frontend display
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = '5f33954d-dd90-497f-8bc8-2d7f1718c0bd';

-- Create helper function to check if user is moderator or admin
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid
      AND role IN ('admin', 'moderator')
  )
$$;

-- Update categories policy to allow moderators
DROP POLICY IF EXISTS "Only admins can manage categories" ON public.categories;
CREATE POLICY "Admins and moderators can manage categories" 
ON public.categories 
FOR ALL 
USING (is_moderator_or_admin(auth.uid()));

-- Update news policy to allow moderators
DROP POLICY IF EXISTS "Admins can manage news" ON public.news;
CREATE POLICY "Admins and moderators can manage news" 
ON public.news 
FOR ALL 
USING (is_moderator_or_admin(auth.uid()))
WITH CHECK (is_moderator_or_admin(auth.uid()));

-- Update seller_reports policy to allow moderators to view
CREATE POLICY "Moderators can view seller reports" 
ON public.seller_reports 
FOR SELECT 
USING (is_moderator_or_admin(auth.uid()));

-- Allow moderators to update seller_reports
CREATE POLICY "Moderators can update seller reports" 
ON public.seller_reports 
FOR UPDATE 
USING (is_moderator_or_admin(auth.uid()));

-- Allow moderators to view report_messages
CREATE POLICY "Moderators can view report messages" 
ON public.report_messages 
FOR SELECT 
USING (is_moderator_or_admin(auth.uid()));

-- Allow moderators to send report_messages
CREATE POLICY "Moderators can send report messages" 
ON public.report_messages 
FOR INSERT 
WITH CHECK (is_moderator_or_admin(auth.uid()) AND auth.uid() = sender_id);

-- Update disputes policy to allow moderators to view
CREATE POLICY "Moderators can view all disputes" 
ON public.disputes 
FOR SELECT 
USING (is_moderator_or_admin(auth.uid()));

-- Update disputes policy to allow moderators to update
DROP POLICY IF EXISTS "Admins can update disputes" ON public.disputes;
CREATE POLICY "Admins and moderators can update disputes" 
ON public.disputes 
FOR UPDATE 
USING (is_moderator_or_admin(auth.uid()));

-- Allow moderators to view dispute_messages
CREATE POLICY "Moderators can view dispute messages" 
ON public.dispute_messages 
FOR SELECT 
USING (is_moderator_or_admin(auth.uid()));

-- Allow moderators to send dispute_messages  
CREATE POLICY "Moderators can send dispute messages" 
ON public.dispute_messages 
FOR INSERT 
WITH CHECK (is_moderator_or_admin(auth.uid()) AND auth.uid() = sender_id);

-- Update forum_categories to allow moderator management
DROP POLICY IF EXISTS "Admins can manage forum categories" ON public.forum_categories;
CREATE POLICY "Admins and moderators can manage forum categories" 
ON public.forum_categories 
FOR ALL 
USING (is_moderator_or_admin(auth.uid()));

-- Update forum_posts delete policy
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.forum_posts;
CREATE POLICY "Users can delete their own posts or moderators" 
ON public.forum_posts 
FOR DELETE 
USING ((auth.uid() = author_id) OR is_moderator_or_admin(auth.uid()));

-- Update forum_posts update policy
DROP POLICY IF EXISTS "Users can update their own posts" ON public.forum_posts;
CREATE POLICY "Users can update their own posts or moderators" 
ON public.forum_posts 
FOR UPDATE 
USING ((auth.uid() = author_id) OR is_moderator_or_admin(auth.uid()));

-- Update forum_comments delete policy
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.forum_comments;
CREATE POLICY "Users can delete their own comments or moderators" 
ON public.forum_comments 
FOR DELETE 
USING ((auth.uid() = author_id) OR is_moderator_or_admin(auth.uid()));

-- Update forum_comments update policy  
DROP POLICY IF EXISTS "Users can update their own comments" ON public.forum_comments;
CREATE POLICY "Users can update their own comments or moderators" 
ON public.forum_comments 
FOR UPDATE 
USING ((auth.uid() = author_id) OR is_moderator_or_admin(auth.uid()));

-- Update forum_awards to allow moderator management
DROP POLICY IF EXISTS "Admins can manage awards" ON public.forum_awards;
CREATE POLICY "Admins and moderators can manage awards" 
ON public.forum_awards 
FOR ALL 
USING (is_moderator_or_admin(auth.uid()));

-- Update subcategories to allow moderator management
CREATE POLICY "Moderators can manage subcategories" 
ON public.subcategories 
FOR ALL 
USING (is_moderator_or_admin(auth.uid()));