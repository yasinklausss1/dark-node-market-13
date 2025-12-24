import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useForum, ForumPost as ForumPostType, ForumComment, ForumAward } from '@/hooks/useForum';
import { ForumCommentSection } from '@/components/forum/ForumCommentSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  Bookmark,
  Share2,
  MoreHorizontal,
  Pin,
  Lock,
  Unlock,
  Trash2,
  Eye,
  BadgeCheck,
  Award,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import SellerProfileModal from '@/components/SellerProfileModal';

const ForumPost: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { 
    fetchPost, 
    fetchComments, 
    createComment,
    votePost,
    voteComment,
    savePost,
    fetchAwards,
    giveAward,
    pinPost,
    lockPost,
    deletePost,
    deleteComment
  } = useForum();

  const [post, setPost] = useState<ForumPostType | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [awards, setAwards] = useState<ForumAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const isAuthor = user?.id === post?.author_id;
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (postId) {
      loadPost();
      loadComments();
      loadAwards();
    }
  }, [postId]);

  const loadPost = async () => {
    if (!postId) return;
    setLoading(true);
    const data = await fetchPost(postId);
    setPost(data);
    setLoading(false);
  };

  const loadComments = async () => {
    if (!postId) return;
    const data = await fetchComments(postId);
    setComments(data);
  };

  const loadAwards = async () => {
    const data = await fetchAwards();
    setAwards(data);
  };

  const handleVotePost = async (type: 'up' | 'down') => {
    if (!post) return;
    await votePost(post.id, type);
    
    // Optimistic update
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

    setPost({
      ...post,
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      user_vote: newVote
    });
  };

  const handleSave = async () => {
    if (!post) return;
    await savePost(post.id);
    setPost({ ...post, is_saved: !post.is_saved });
  };

  const handleReply = async (parentId: string | null, content: string) => {
    if (!postId) return;
    const result = await createComment(postId, content, parentId || undefined);
    if (result) {
      loadComments();
    }
  };

  const handleVoteComment = async (commentId: string, type: 'up' | 'down') => {
    await voteComment(commentId, type);
    loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    loadComments();
  };

  const handleGiveAward = async (awardId: string) => {
    if (!post) return;
    const success = await giveAward(post.id, awardId);
    if (success) {
      setShowAwardModal(false);
      loadPost();
    }
  };

  const handlePin = async () => {
    if (!post) return;
    await pinPost(post.id, !post.is_pinned);
    setPost({ ...post, is_pinned: !post.is_pinned });
  };

  const handleLock = async () => {
    if (!post) return;
    await lockPost(post.id, !post.is_locked);
    setPost({ ...post, is_locked: !post.is_locked });
  };

  const handleDelete = async () => {
    if (!post) return;
    const success = await deletePost(post.id);
    if (success) {
      navigate('/forum');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate('/forum')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-48 ml-2" />
          </div>
        </header>
        <div className="container py-6 max-w-4xl">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Post nicht gefunden.</p>
          <Button onClick={() => navigate('/forum')}>Zurück zum Forum</Button>
        </div>
      </div>
    );
  }

  const score = post.upvotes - post.downvotes;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: de });
  const fullDate = format(new Date(post.created_at), 'dd.MM.yyyy HH:mm', { locale: de });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/forum')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2 truncate">
            {post.category?.name}
          </span>
        </div>
      </header>

      {/* Post Content */}
      <div className="container py-6 max-w-4xl">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex gap-4">
              {/* Vote buttons */}
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full",
                    post.user_vote === 'up' && "text-orange-500 bg-orange-500/10"
                  )}
                  onClick={() => handleVotePost('up')}
                >
                  <ArrowBigUp className="h-6 w-6" />
                </Button>
                <span className={cn(
                  "text-lg font-bold",
                  score > 0 && "text-orange-500",
                  score < 0 && "text-blue-500"
                )}>
                  {score}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full",
                    post.user_vote === 'down' && "text-blue-500 bg-blue-500/10"
                  )}
                  onClick={() => handleVotePost('down')}
                >
                  <ArrowBigDown className="h-6 w-6" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1">
                {/* Meta info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <Badge 
                    variant="secondary" 
                    style={{ backgroundColor: `${post.category?.color}20`, color: post.category?.color }}
                  >
                    {post.category?.name}
                  </Badge>
                  <span>•</span>
                  <button 
                    className="flex items-center gap-1 hover:underline"
                    onClick={() => setProfileModalOpen(true)}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={post.author?.profile_picture_url || ''} />
                      <AvatarFallback className="text-[10px]">
                        {post.author?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground hover:text-primary transition-colors">
                      {post.author?.username}
                    </span>
                    {post.author?.is_verified && (
                      <BadgeCheck className="h-3 w-3 text-primary" />
                    )}
                  </button>
                  {post.author?.role === 'seller' && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">Seller</Badge>
                  )}
                  {post.author?.role === 'admin' && (
                    <Badge className="text-[10px] px-1 py-0 bg-red-500">Admin</Badge>
                  )}
                  <span>•</span>
                  <span title={fullDate}>{timeAgo}</span>
                  {post.is_pinned && (
                    <>
                      <span>•</span>
                      <Pin className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-500">Angepinnt</span>
                    </>
                  )}
                  {post.is_locked && (
                    <>
                      <span>•</span>
                      <Lock className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">Gesperrt</span>
                    </>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold mt-2">
                  {post.flair && (
                    <Badge variant="outline" className="mr-2 text-sm">
                      {post.flair}
                    </Badge>
                  )}
                  {post.title}
                </h1>

                {/* Awards - grouped by type */}
                {post.awards && post.awards.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {Object.entries(
                      post.awards.reduce((acc, award) => {
                        acc[award.icon] = acc[award.icon] || { ...award, count: 0 };
                        acc[award.icon].count++;
                        return acc;
                      }, {} as Record<string, { icon: string; name: string; count: number }>)
                    ).map(([icon, { name, count }]) => (
                      <span 
                        key={icon} 
                        className="text-lg bg-muted rounded px-2 py-0.5 flex items-center gap-1" 
                        title={`${count}x ${name}`}
                      >
                        {count > 1 && <span className="text-sm font-medium">{count}</span>}
                        {icon}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Post content */}
            <div className="prose prose-sm dark:prose-invert max-w-none pl-14">
              <p className="whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* Linked Product */}
            {post.linked_product && (
              <div className="mt-4 ml-14 p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{post.linked_product.title}</p>
                  <p className="text-sm text-muted-foreground">{post.linked_product.price}€</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/marketplace?product=${post.linked_product.id}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Ansehen
                  </Link>
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-6 pl-14 text-sm text-muted-foreground border-t pt-4">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.view_count} Aufrufe</span>
              </div>
              <button 
                onClick={handleSave}
                className={cn(
                  "flex items-center gap-1 hover:text-foreground transition-colors",
                  post.is_saved && "text-primary"
                )}
              >
                <Bookmark className={cn("h-4 w-4", post.is_saved && "fill-current")} />
                <span>{post.is_saved ? 'Gespeichert' : 'Speichern'}</span>
              </button>
              {user && (
                <button 
                  onClick={() => setShowAwardModal(true)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Award className="h-4 w-4" />
                  <span>Award geben</span>
                </button>
              )}
              <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Share2 className="h-4 w-4" />
                <span>Teilen</span>
              </button>
              
              {(isAuthor || isAdmin) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={handlePin}>
                          <Pin className="h-4 w-4 mr-2" />
                          {post.is_pinned ? 'Nicht mehr anpinnen' : 'Anpinnen'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLock}>
                          {post.is_locked ? (
                            <>
                              <Unlock className="h-4 w-4 mr-2" />
                              Entsperren
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Sperren
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem 
                      className="text-red-500"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">
            {post.comment_count} {post.comment_count === 1 ? 'Kommentar' : 'Kommentare'}
          </h2>
          <ForumCommentSection
            comments={comments}
            postId={post.id}
            isLocked={post.is_locked}
            onVote={handleVoteComment}
            onReply={handleReply}
            onDelete={handleDeleteComment}
          />
        </div>
      </div>

      {/* Award Modal */}
      <Dialog open={showAwardModal} onOpenChange={setShowAwardModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award vergeben</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {awards.map(award => (
              <button
                key={award.id}
                onClick={() => handleGiveAward(award.id)}
                className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all text-center"
              >
                <span className="text-3xl block mb-2">{award.icon}</span>
                <p className="font-medium">{award.name}</p>
                <p className="text-xs text-muted-foreground">{award.cost_credits} Credits</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Profile Modal */}
      {post.author && (
        <SellerProfileModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          sellerId={post.author_id}
          sellerUsername={post.author.username}
        />
      )}
    </div>
  );
};

export default ForumPost;
