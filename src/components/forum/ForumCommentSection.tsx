import React, { useState } from 'react';
import { ForumComment } from '@/hooks/useForum';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowBigUp, 
  ArrowBigDown, 
  MessageSquare,
  MoreHorizontal,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SellerProfileModal from '@/components/SellerProfileModal';

interface CommentProps {
  comment: ForumComment;
  depth: number;
  onVote: (commentId: string, type: 'up' | 'down') => void;
  onReply: (parentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isLocked?: boolean;
}

const CommentItem: React.FC<CommentProps> = ({
  comment,
  depth,
  onVote,
  onReply,
  onDelete,
  isLocked
}) => {
  const { user, profile } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const score = comment.upvotes - comment.downvotes;
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: de });
  const isAuthor = user?.id === comment.author_id;
  const isAdmin = profile?.role === 'admin';

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  if (comment.is_deleted && (!comment.replies || comment.replies.length === 0)) {
    return null;
  }

  return (
    <div className={cn("relative", depth > 0 && "ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 border-border/50")}>
      <div className="py-1.5 sm:py-2">
        {/* Header */}
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground mb-1 flex-wrap">
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hover:text-foreground"
          >
            {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
          <button 
            className="flex items-center gap-1 hover:underline"
            onClick={() => comment.author && setProfileModalOpen(true)}
          >
            <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
              <AvatarImage src={comment.author?.profile_picture_url || ''} />
              <AvatarFallback className="text-[8px] sm:text-[10px]">
                {comment.author?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground hover:text-primary transition-colors truncate max-w-[100px] sm:max-w-none">
              {comment.author?.username || '[Gelöscht]'}
            </span>
            {comment.author?.is_verified && (
              <BadgeCheck className="h-3 w-3 text-primary shrink-0" />
            )}
            {comment.author?.role === 'seller' && (
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0 hidden sm:inline-flex">Seller</Badge>
            )}
            {comment.author?.role === 'admin' && (
              <Badge className="text-[9px] sm:text-[10px] px-1 py-0 bg-red-500">Admin</Badge>
            )}
          </button>
          <span className="hidden xs:inline">•</span>
          <span className="hidden xs:inline">{timeAgo}</span>
          <span className="hidden sm:inline">•</span>
          <span className={cn(
            "hidden sm:inline",
            score > 0 && "text-orange-500",
            score < 0 && "text-blue-500"
          )}>
            {score} Punkte
          </span>
        </div>

        {!collapsed && (
          <>
            {/* Content */}
            <div className={cn(
              "text-xs sm:text-sm pl-4 sm:pl-6",
              comment.is_deleted && "italic text-muted-foreground"
            )}>
              {comment.content}
            </div>

            {/* Mobile: Show time and score under content */}
            <div className="flex items-center gap-2 pl-4 sm:hidden text-[10px] text-muted-foreground mt-1">
              <span>{timeAgo}</span>
              <span>•</span>
              <span className={cn(
                score > 0 && "text-orange-500",
                score < 0 && "text-blue-500"
              )}>
                {score} Punkte
              </span>
            </div>

            {/* Actions */}
            {!comment.is_deleted && (
              <div className="flex items-center gap-1 sm:gap-2 mt-1 pl-4 sm:pl-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-1",
                    comment.user_vote === 'up' && "text-orange-500"
                  )}
                  onClick={() => onVote(comment.id, 'up')}
                >
                  <ArrowBigUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-1",
                    comment.user_vote === 'down' && "text-blue-500"
                  )}
                  onClick={() => onVote(comment.id, 'down')}
                >
                  <ArrowBigDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                {!isLocked && user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] sm:text-xs px-1 sm:px-2"
                    onClick={() => setShowReplyForm(!showReplyForm)}
                  >
                    <MessageSquare className="h-3 w-3 mr-0.5 sm:mr-1" />
                    <span className="hidden xs:inline">Antworten</span>
                  </Button>
                )}
                {(isAuthor || isAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-1">
                        <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        className="text-red-500 text-xs sm:text-sm"
                        onClick={() => onDelete(comment.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {/* Reply form */}
            {showReplyForm && (
              <div className="mt-2 pl-4 sm:pl-6 space-y-2">
                <Textarea
                  placeholder="Schreibe eine Antwort..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[60px] sm:min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleReply} className="text-xs sm:text-sm">
                    Antworten
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowReplyForm(false)}
                    className="text-xs sm:text-sm"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.map(reply => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                    onVote={onVote}
                    onReply={onReply}
                    onDelete={onDelete}
                    isLocked={isLocked}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Profile Modal */}
      {comment.author && (
        <SellerProfileModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          sellerId={comment.author_id}
          sellerUsername={comment.author.username}
        />
      )}
    </div>
  );
};

interface ForumCommentSectionProps {
  comments: ForumComment[];
  postId: string;
  isLocked?: boolean;
  onVote: (commentId: string, type: 'up' | 'down') => void;
  onReply: (parentId: string | null, content: string) => void;
  onDelete: (commentId: string) => void;
}

export const ForumCommentSection: React.FC<ForumCommentSectionProps> = ({
  comments,
  postId,
  isLocked,
  onVote,
  onReply,
  onDelete
}) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      onReply(null, newComment);
      setNewComment('');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* New comment form */}
      {user && !isLocked && (
        <div className="space-y-2">
          <Textarea
            placeholder="Was denkst du?"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] sm:min-h-[100px] text-sm"
          />
          <Button onClick={handleSubmit} disabled={!newComment.trim()} size="sm" className="sm:size-default">
            Kommentieren
          </Button>
        </div>
      )}

      {isLocked && (
        <div className="p-3 sm:p-4 rounded-lg bg-muted/50 text-center text-muted-foreground text-sm">
          Dieser Thread ist gesperrt. Neue Kommentare sind nicht möglich.
        </div>
      )}

      {!user && (
        <div className="p-3 sm:p-4 rounded-lg bg-muted/50 text-center text-muted-foreground text-sm">
          Melde dich an, um zu kommentieren.
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-1">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
            Noch keine Kommentare. Sei der Erste!
          </p>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              onVote={onVote}
              onReply={onReply}
              onDelete={onDelete}
              isLocked={isLocked}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ForumCommentSection;
