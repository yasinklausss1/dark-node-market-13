import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForum, ForumPost } from '@/hooks/useForum';
import { ForumPostCard } from '@/components/forum/ForumPostCard';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { CreatePostModal } from '@/components/forum/CreatePostModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Flame, 
  Clock, 
  TrendingUp,
  RefreshCw
} from 'lucide-react';

const Forum: React.FC = () => {
  const navigate = useNavigate();
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
      limit: 50
    });
    setPosts(data);
    setLoading(false);
  };

  const handleVote = async (postId: string, type: 'up' | 'down') => {
    await votePost(postId, type);
    // Optimistic update
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-3 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold ml-2">Forum</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadPosts}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-4 sm:py-6 px-3 sm:px-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Mobile: Create Post Button & Categories */}
          <div className="lg:hidden space-y-3">
            {user && (
              <Button 
                className="w-full" 
                size="default"
                onClick={() => setShowCreateModal(true)}
              >
                <span className="mr-2">+</span>
                Post erstellen
              </Button>
            )}
            {/* Mobile Category Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => setSelectedCategory(null)}
              >
                Alle
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <ForumSidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onCreatePost={() => setShowCreateModal(true)}
              isLoggedIn={!!user}
            />
          </aside>

          {/* Posts Feed */}
          <main className="flex-1 min-w-0">
            {/* Sort Tabs */}
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="mb-4">
              <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
                <TabsTrigger value="hot" className="gap-1 text-xs sm:text-sm">
                  <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Hot</span>
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-1 text-xs sm:text-sm">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Neu</span>
                </TabsTrigger>
                <TabsTrigger value="top" className="gap-1 text-xs sm:text-sm">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Top</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Posts List */}
            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-28 sm:h-32 w-full" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-muted-foreground text-sm sm:text-base">Keine Posts gefunden.</p>
                {user && (
                  <Button 
                    className="mt-4"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Erstelle den ersten Post!
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {posts.map(post => (
                  <ForumPostCard
                    key={post.id}
                    post={post}
                    onVote={handleVote}
                    onSave={handleSave}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

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

export default Forum;
