-- Create table to track unique post views per user
CREATE TABLE public.forum_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forum_post_views ENABLE ROW LEVEL SECURITY;

-- Anyone can view post views
CREATE POLICY "Anyone can view post views" 
ON public.forum_post_views 
FOR SELECT 
USING (true);

-- Authenticated users can insert their own views
CREATE POLICY "Users can insert their own views" 
ON public.forum_post_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_forum_post_views_post_user ON public.forum_post_views(post_id, user_id);