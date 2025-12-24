import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForum, ForumPost } from '@/hooks/useForum';
import { ForumPostCard } from '@/components/forum/ForumPostCard';
import { CreatePostModal } from '@/components/forum/CreatePostModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Flame, 
  Clock, 
  TrendingUp,
  PlusCircle,
  MessageSquare,
  Star,
  HelpCircle,
  Megaphone,
  ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Star,
  HelpCircle,
  Megaphone,
  ShoppingBag,
};

interface ForumInlineProps {
  className?: string;
}

export const ForumInline: React.FC<ForumInlineProps> = ({ className }) => {
  const { user } = useAuth();
  const { 
    categories, 
    loading: categoriesLoading, 
    fetchPosts, 
    createPost,
    votePost,
    savePost 
  } = useForum();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, sortBy]);

  const loadPosts = async () => {
    setLoading(true);
    const data = await fetchPosts({
      categoryId: selectedCategory || undefined,
      sortBy,
      limit: 25
    });
    setPosts(data);
    setLoading(false);
  };

  const handleVote = async (postId: string, type: 'up' | 'down') => {
    await votePost(postId, type);
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      
      const wasUp = post.user_vote === 'up';
      const wasDown = post.user_vote === 'down';
      const isUp = type === 'up';
      
      let newUpvotes = post.upvotes;
      let newDownvotes = post.downvotes;
      let newVote: 'up' | 'down' | null = type;

      if (wasUp && isUp) {
        newUpvotes--;
        newVote = null;
      } else if (wasDown && !isUp) {
        newDownvotes--;
        newVote = null;
      } else if (wasUp && !isUp) {
        newUpvotes--;
        newDownvotes++;
      } else if (wasDown && isUp) {
        newDownvotes--;
        newUpvotes++;
      } else if (isUp) {
        newUpvotes++;
      } else {
        newDownvotes++;
      }

      return {
        ...post,
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        user_vote: newVote
      };
    }));
  };

  const handleSave = async (postId: string) => {
    await savePost(postId);
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, is_saved: !post.is_saved } : post
    ));
  };

  const handleCreatePost = async (data: any) => {
    const result = await createPost(data);
    if (result) {
      loadPosts();
    }
    return result;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with create button and sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {user && (
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Post erstellen
            </Button>
          )}
        </div>
        
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <TabsList>
            <TabsTrigger value="hot" className="gap-1">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Hot</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Neu</span>
            </TabsTrigger>
            <TabsTrigger value="top" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Top</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Categories filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          Alle
        </Button>
        {categories.map(category => {
          const IconComponent = ICON_MAP[category.icon] || MessageSquare;
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="gap-1"
            >
              <IconComponent 
                className="h-3 w-3" 
                style={{ color: selectedCategory === category.id ? undefined : category.color }}
              />
              {category.name}
            </Button>
          );
        })}
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Noch keine Posts in dieser Kategorie.</p>
            {user && (
              <Button onClick={() => setShowCreateModal(true)}>
                Erstelle den ersten Post!
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <ForumPostCard
              key={post.id}
              post={post}
              onVote={handleVote}
              onSave={handleSave}
              compact
            />
          ))}
        </div>
      )}

      {/* Community info card */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Community Regeln</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Sei respektvoll gegenüber anderen Nutzern</p>
          <p>• Kein Spam oder irrelevante Werbung</p>
          <p>• Konstruktive Diskussionen führen</p>
        </CardContent>
      </Card>

      {/* Create Post Modal */}
      <CreatePostModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        categories={categories}
        defaultCategoryId={selectedCategory || undefined}
        onSubmit={handleCreatePost}
      />
    </div>
  );
};

export default ForumInline;
