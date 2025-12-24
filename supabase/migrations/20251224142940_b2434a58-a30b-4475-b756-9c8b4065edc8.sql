-- Forum Categories
CREATE TABLE public.forum_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'MessageSquare',
    color TEXT DEFAULT '#6366f1',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Forum Posts/Threads
CREATE TABLE public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.forum_categories(id) ON DELETE CASCADE NOT NULL,
    author_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    flair TEXT,
    linked_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    view_count INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Forum Comments (nested/threaded)
CREATE TABLE public.forum_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Post Votes
CREATE TABLE public.forum_post_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Comment Votes
CREATE TABLE public.forum_comment_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

-- User Karma
CREATE TABLE public.forum_user_karma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    post_karma INTEGER DEFAULT 0,
    comment_karma INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Post Awards
CREATE TABLE public.forum_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    cost_credits INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Awarded Posts
CREATE TABLE public.forum_post_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    award_id UUID REFERENCES public.forum_awards(id) ON DELETE CASCADE NOT NULL,
    giver_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Saved Posts
CREATE TABLE public.forum_saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_user_karma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_saved_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Categories: Everyone can view, only admins can manage
CREATE POLICY "Anyone can view forum categories" ON public.forum_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage forum categories" ON public.forum_categories FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Posts: Everyone can view, authenticated users can create
CREATE POLICY "Anyone can view forum posts" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own posts" ON public.forum_posts FOR UPDATE USING (auth.uid() = author_id OR get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own posts" ON public.forum_posts FOR DELETE USING (auth.uid() = author_id OR get_user_role(auth.uid()) = 'admin');

-- Comments: Everyone can view, authenticated users can create
CREATE POLICY "Anyone can view forum comments" ON public.forum_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.forum_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own comments" ON public.forum_comments FOR UPDATE USING (auth.uid() = author_id OR get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users can delete their own comments" ON public.forum_comments FOR DELETE USING (auth.uid() = author_id OR get_user_role(auth.uid()) = 'admin');

-- Post Votes
CREATE POLICY "Anyone can view post votes" ON public.forum_post_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote on posts" ON public.forum_post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change their own post votes" ON public.forum_post_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove their own post votes" ON public.forum_post_votes FOR DELETE USING (auth.uid() = user_id);

-- Comment Votes
CREATE POLICY "Anyone can view comment votes" ON public.forum_comment_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote on comments" ON public.forum_comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change their own comment votes" ON public.forum_comment_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove their own comment votes" ON public.forum_comment_votes FOR DELETE USING (auth.uid() = user_id);

-- Karma
CREATE POLICY "Anyone can view karma" ON public.forum_user_karma FOR SELECT USING (true);
CREATE POLICY "System can manage karma" ON public.forum_user_karma FOR ALL USING (true);

-- Awards
CREATE POLICY "Anyone can view awards" ON public.forum_awards FOR SELECT USING (true);
CREATE POLICY "Admins can manage awards" ON public.forum_awards FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Post Awards
CREATE POLICY "Anyone can view post awards" ON public.forum_post_awards FOR SELECT USING (true);
CREATE POLICY "Authenticated users can give awards" ON public.forum_post_awards FOR INSERT WITH CHECK (auth.uid() = giver_id);

-- Saved Posts
CREATE POLICY "Users can view their saved posts" ON public.forum_saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts" ON public.forum_saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave posts" ON public.forum_saved_posts FOR DELETE USING (auth.uid() = user_id);

-- Function to update post vote counts
CREATE OR REPLACE FUNCTION public.update_post_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'up' THEN
            UPDATE forum_posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
        ELSE
            UPDATE forum_posts SET downvotes = downvotes + 1 WHERE id = NEW.post_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'up' THEN
            UPDATE forum_posts SET upvotes = upvotes - 1 WHERE id = OLD.post_id;
        ELSE
            UPDATE forum_posts SET downvotes = downvotes - 1 WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
            UPDATE forum_posts SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.post_id;
        ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
            UPDATE forum_posts SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.post_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_post_vote_change
AFTER INSERT OR UPDATE OR DELETE ON public.forum_post_votes
FOR EACH ROW EXECUTE FUNCTION public.update_post_votes();

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION public.update_comment_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'up' THEN
            UPDATE forum_comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
        ELSE
            UPDATE forum_comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'up' THEN
            UPDATE forum_comments SET upvotes = upvotes - 1 WHERE id = OLD.comment_id;
        ELSE
            UPDATE forum_comments SET downvotes = downvotes - 1 WHERE id = OLD.comment_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
            UPDATE forum_comments SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.comment_id;
        ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
            UPDATE forum_comments SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.comment_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_comment_vote_change
AFTER INSERT OR UPDATE OR DELETE ON public.forum_comment_votes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_votes();

-- Function to update comment count
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_comment_change
AFTER INSERT OR DELETE ON public.forum_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();

-- Insert default categories
INSERT INTO public.forum_categories (name, description, icon, color, display_order) VALUES
('Allgemein', 'Allgemeine Diskussionen und Fragen', 'MessageSquare', '#6366f1', 1),
('Produkt-Reviews', 'Teile deine Erfahrungen mit Produkten', 'Star', '#f59e0b', 2),
('Support & Hilfe', 'Fragen und Hilfe zur Plattform', 'HelpCircle', '#10b981', 3),
('Ankündigungen', 'Offizielle Neuigkeiten und Updates', 'Megaphone', '#ef4444', 4),
('Marketplace', 'Diskussionen über Angebote und Deals', 'ShoppingBag', '#8b5cf6', 5);

-- Insert default awards
INSERT INTO public.forum_awards (name, icon, description, cost_credits) VALUES
('Gold', '🏆', 'Der beste Beitrag!', 50),
('Silber', '🥈', 'Sehr hilfreicher Beitrag', 25),
('Hilfreich', '💡', 'Hat mir geholfen', 10),
('Feuer', '🔥', 'Heißer Beitrag!', 15),
('Herz', '❤️', 'Liebe diesen Beitrag', 5);