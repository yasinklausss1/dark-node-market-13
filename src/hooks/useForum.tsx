import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ForumCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
}

export interface ForumPost {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  flair: string | null;
  linked_product_id: string | null;
  view_count: number;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    username: string;
    profile_picture_url: string | null;
    role: string;
    is_verified: boolean;
  };
  category?: ForumCategory;
  linked_product?: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
  };
  user_vote?: 'up' | 'down' | null;
  is_saved?: boolean;
  awards?: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
}

export interface ForumComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  is_deleted: boolean;
  created_at: string;
  author?: {
    username: string;
    profile_picture_url: string | null;
    role: string;
    is_verified: boolean;
  };
  user_vote?: 'up' | 'down' | null;
  replies?: ForumComment[];
}

export interface ForumAward {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  cost_credits: number;
}

export function useForum() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .order('display_order');
    
    if (!error && data) {
      setCategories(data as ForumCategory[]);
    }
    setLoading(false);
  };

  const fetchPosts = async (options?: {
    categoryId?: string;
    sortBy?: 'hot' | 'new' | 'top';
    limit?: number;
    offset?: number;
  }) => {
    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles!forum_posts_author_id_fkey(username, profile_picture_url, role, is_verified),
        category:forum_categories(*),
        linked_product:products(id, title, price, image_url)
      `);

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    // Sort by options
    if (options?.sortBy === 'new') {
      query = query.order('created_at', { ascending: false });
    } else if (options?.sortBy === 'top') {
      query = query.order('upvotes', { ascending: false });
    } else {
      // Hot: combination of votes and recency
      query = query.order('is_pinned', { ascending: false })
                   .order('upvotes', { ascending: false })
                   .order('created_at', { ascending: false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    // Get user votes if logged in
    let postsWithVotes = data as unknown as ForumPost[];
    if (user && data && data.length > 0) {
      const postIds = data.map(p => p.id);
      const { data: votes } = await supabase
        .from('forum_post_votes')
        .select('post_id, vote_type')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      const { data: saved } = await supabase
        .from('forum_saved_posts')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      postsWithVotes = postsWithVotes.map(post => ({
        ...post,
        user_vote: votes?.find(v => v.post_id === post.id)?.vote_type as 'up' | 'down' | null,
        is_saved: saved?.some(s => s.post_id === post.id) || false
      }));
    }

    return postsWithVotes;
  };

  const fetchPost = async (postId: string) => {
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles!forum_posts_author_id_fkey(username, profile_picture_url, role, is_verified),
        category:forum_categories(*),
        linked_product:products(id, title, price, image_url)
      `)
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return null;
    }

    // Increment view count
    await supabase
      .from('forum_posts')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', postId);

    let postWithVote = data as unknown as ForumPost;
    if (user) {
      const { data: vote } = await supabase
        .from('forum_post_votes')
        .select('vote_type')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      const { data: saved } = await supabase
        .from('forum_saved_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      postWithVote = {
        ...postWithVote,
        user_vote: vote?.vote_type as 'up' | 'down' | null,
        is_saved: !!saved
      };
    }

    // Get awards
    const { data: awardData } = await supabase
      .from('forum_post_awards')
      .select('award:forum_awards(id, name, icon)')
      .eq('post_id', postId);

    if (awardData) {
      postWithVote.awards = awardData.map(a => a.award as unknown as { id: string; name: string; icon: string });
    }

    return postWithVote;
  };

  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from('forum_comments')
      .select(`
        *,
        author:profiles!forum_comments_author_id_fkey(username, profile_picture_url, role, is_verified)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    let commentsWithVotes = data as unknown as ForumComment[];
    if (user && data && data.length > 0) {
      const commentIds = data.map(c => c.id);
      const { data: votes } = await supabase
        .from('forum_comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);

      commentsWithVotes = commentsWithVotes.map(comment => ({
        ...comment,
        user_vote: votes?.find(v => v.comment_id === comment.id)?.vote_type as 'up' | 'down' | null
      }));
    }

    // Build nested structure
    const commentMap = new Map<string, ForumComment>();
    const rootComments: ForumComment[] = [];

    commentsWithVotes.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    commentsWithVotes.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies?.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  };

  const createPost = async (data: {
    category_id: string;
    title: string;
    content: string;
    flair?: string;
    linked_product_id?: string;
  }) => {
    if (!user) {
      toast({ title: 'Fehler', description: 'Du musst eingeloggt sein', variant: 'destructive' });
      return null;
    }

    const { data: post, error } = await supabase
      .from('forum_posts')
      .insert({
        ...data,
        author_id: user.id
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Fehler', description: 'Post konnte nicht erstellt werden', variant: 'destructive' });
      return null;
    }

    toast({ title: 'Erfolg', description: 'Post wurde erstellt' });
    return post;
  };

  const createComment = async (postId: string, content: string, parentId?: string) => {
    if (!user) {
      toast({ title: 'Fehler', description: 'Du musst eingeloggt sein', variant: 'destructive' });
      return null;
    }

    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        parent_id: parentId || null,
        author_id: user.id,
        content
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Fehler', description: 'Kommentar konnte nicht erstellt werden', variant: 'destructive' });
      return null;
    }

    return comment;
  };

  const votePost = async (postId: string, voteType: 'up' | 'down') => {
    if (!user) {
      toast({ title: 'Fehler', description: 'Du musst eingeloggt sein', variant: 'destructive' });
      return;
    }

    // Check existing vote
    const { data: existing } = await supabase
      .from('forum_post_votes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if (existing.vote_type === voteType) {
        // Remove vote
        await supabase
          .from('forum_post_votes')
          .delete()
          .eq('id', existing.id);
      } else {
        // Change vote
        await supabase
          .from('forum_post_votes')
          .update({ vote_type: voteType })
          .eq('id', existing.id);
      }
    } else {
      // New vote
      await supabase
        .from('forum_post_votes')
        .insert({
          post_id: postId,
          user_id: user.id,
          vote_type: voteType
        });
    }
  };

  const voteComment = async (commentId: string, voteType: 'up' | 'down') => {
    if (!user) {
      toast({ title: 'Fehler', description: 'Du musst eingeloggt sein', variant: 'destructive' });
      return;
    }

    const { data: existing } = await supabase
      .from('forum_comment_votes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      if (existing.vote_type === voteType) {
        await supabase
          .from('forum_comment_votes')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('forum_comment_votes')
          .update({ vote_type: voteType })
          .eq('id', existing.id);
      }
    } else {
      await supabase
        .from('forum_comment_votes')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          vote_type: voteType
        });
    }
  };

  const savePost = async (postId: string) => {
    if (!user) {
      toast({ title: 'Fehler', description: 'Du musst eingeloggt sein', variant: 'destructive' });
      return;
    }

    const { data: existing } = await supabase
      .from('forum_saved_posts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('forum_saved_posts')
        .delete()
        .eq('id', existing.id);
      toast({ title: 'Entfernt', description: 'Post wurde von Gespeicherten entfernt' });
    } else {
      await supabase
        .from('forum_saved_posts')
        .insert({
          post_id: postId,
          user_id: user.id
        });
      toast({ title: 'Gespeichert', description: 'Post wurde gespeichert' });
    }
  };

  const fetchAwards = async () => {
    const { data } = await supabase
      .from('forum_awards')
      .select('*')
      .order('cost_credits');
    return (data || []) as ForumAward[];
  };

  const giveAward = async (postId: string, awardId: string) => {
    if (!user) {
      toast({ title: 'Fehler', description: 'Du musst eingeloggt sein', variant: 'destructive' });
      return false;
    }

    const { error } = await supabase
      .from('forum_post_awards')
      .insert({
        post_id: postId,
        award_id: awardId,
        giver_id: user.id
      });

    if (error) {
      toast({ title: 'Fehler', description: 'Award konnte nicht vergeben werden', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Erfolg', description: 'Award wurde vergeben!' });
    return true;
  };

  const pinPost = async (postId: string, pin: boolean) => {
    await supabase
      .from('forum_posts')
      .update({ is_pinned: pin })
      .eq('id', postId);
  };

  const lockPost = async (postId: string, lock: boolean) => {
    await supabase
      .from('forum_posts')
      .update({ is_locked: lock })
      .eq('id', postId);
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      toast({ title: 'Fehler', description: 'Post konnte nicht gelöscht werden', variant: 'destructive' });
      return false;
    }

    toast({ title: 'Gelöscht', description: 'Post wurde gelöscht' });
    return true;
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('forum_comments')
      .update({ is_deleted: true, content: '[Gelöscht]' })
      .eq('id', commentId);

    if (error) {
      toast({ title: 'Fehler', description: 'Kommentar konnte nicht gelöscht werden', variant: 'destructive' });
      return false;
    }

    return true;
  };

  return {
    categories,
    loading,
    fetchPosts,
    fetchPost,
    fetchComments,
    createPost,
    createComment,
    votePost,
    voteComment,
    savePost,
    fetchAwards,
    giveAward,
    pinPost,
    lockPost,
    deletePost,
    deleteComment,
    refetchCategories: fetchCategories
  };
}
