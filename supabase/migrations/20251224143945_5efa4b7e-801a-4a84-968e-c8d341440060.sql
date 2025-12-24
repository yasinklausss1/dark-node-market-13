-- Add foreign key relationships for author_id columns
ALTER TABLE public.forum_posts 
ADD CONSTRAINT forum_posts_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.forum_comments 
ADD CONSTRAINT forum_comments_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;