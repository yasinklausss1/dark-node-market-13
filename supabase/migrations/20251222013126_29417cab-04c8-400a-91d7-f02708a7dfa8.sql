-- Add user_id column to page_visits for tracking logged-in users
ALTER TABLE public.page_visits 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster user lookups
CREATE INDEX idx_page_visits_user_id ON public.page_visits(user_id);