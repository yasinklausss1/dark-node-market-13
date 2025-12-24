import React from 'react';
import { Link } from 'react-router-dom';
import { ForumPost } from '@/hooks/useForum';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowBigUp, 
  ArrowBigDown, 
  MessageSquare, 
  Bookmark, 
  Share2,
  Pin,
  Lock,
  Eye,
  BadgeCheck,
  ShoppingBag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ForumPostCardProps {
  post: ForumPost;
  onVote: (postId: string, type: 'up' | 'down') => void;
  onSave: (postId: string) => void;
  compact?: boolean;
}

export const ForumPostCard: React.FC<ForumPostCardProps> = ({
  post,
  onVote,
  onSave,
  compact = false
}) => {
  const score = post.upvotes - post.downvotes;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: de });

  return (
    <Card className={cn(
      "transition-all hover:border-primary/30",
      post.is_pinned && "border-amber-500/50 bg-amber-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-1 min-w-[40px]">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                post.user_vote === 'up' && "text-orange-500 bg-orange-500/10"
              )}
              onClick={(e) => { e.preventDefault(); onVote(post.id, 'up'); }}
            >
              <ArrowBigUp className="h-5 w-5" />
            </Button>
            <span className={cn(
              "text-sm font-bold",
              score > 0 && "text-orange-500",
              score < 0 && "text-blue-500"
            )}>
              {score}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
                post.user_vote === 'down' && "text-blue-500 bg-blue-500/10"
              )}
              onClick={(e) => { e.preventDefault(); onVote(post.id, 'down'); }}
            >
              <ArrowBigDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
              {post.category && (
                <Badge 
                  variant="secondary" 
                  style={{ backgroundColor: `${post.category.color}20`, color: post.category.color }}
                >
                  {post.category.name}
                </Badge>
              )}
              <span>•</span>
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={post.author?.profile_picture_url || ''} />
                  <AvatarFallback className="text-[8px]">
                    {post.author?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {post.author?.username}
                </span>
                {post.author?.is_verified && (
                  <BadgeCheck className="h-3 w-3 text-primary" />
                )}
                {post.author?.role === 'seller' && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">Seller</Badge>
                )}
                {post.author?.role === 'admin' && (
                  <Badge className="text-[10px] px-1 py-0 bg-red-500">Admin</Badge>
                )}
              </div>
              <span>•</span>
              <span>{timeAgo}</span>
              {post.is_pinned && (
                <>
                  <span>•</span>
                  <Pin className="h-3 w-3 text-amber-500" />
                </>
              )}
              {post.is_locked && (
                <>
                  <span>•</span>
                  <Lock className="h-3 w-3 text-red-500" />
                </>
              )}
            </div>

            {/* Title */}
            <Link to={`/forum/post/${post.id}`}>
              <h3 className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2">
                {post.flair && (
                  <Badge variant="outline" className="mr-2 text-xs">
                    {post.flair}
                  </Badge>
                )}
                {post.title}
              </h3>
            </Link>

            {/* Awards */}
            {post.awards && post.awards.length > 0 && (
              <div className="flex gap-1 mt-1">
                {post.awards.slice(0, 5).map((award, i) => (
                  <span key={i} className="text-sm" title={award.name}>
                    {award.icon}
                  </span>
                ))}
                {post.awards.length > 5 && (
                  <span className="text-xs text-muted-foreground">+{post.awards.length - 5}</span>
                )}
              </div>
            )}

            {/* Preview content */}
            {!compact && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {post.content}
              </p>
            )}

            {/* Linked product */}
            {post.linked_product && (
              <div className="mt-2 p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{post.linked_product.title}</span>
                <Badge variant="secondary">{post.linked_product.price}€</Badge>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <Link 
                to={`/forum/post/${post.id}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{post.comment_count} Kommentare</span>
              </Link>
              <button 
                onClick={(e) => { e.preventDefault(); onSave(post.id); }}
                className={cn(
                  "flex items-center gap-1 hover:text-foreground transition-colors",
                  post.is_saved && "text-primary"
                )}
              >
                <Bookmark className={cn("h-4 w-4", post.is_saved && "fill-current")} />
                <span>{post.is_saved ? 'Gespeichert' : 'Speichern'}</span>
              </button>
              <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                <Share2 className="h-4 w-4" />
                <span>Teilen</span>
              </button>
              <div className="flex items-center gap-1 ml-auto">
                <Eye className="h-4 w-4" />
                <span>{post.view_count}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForumPostCard;
