import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Clock, User, X } from 'lucide-react';
import { useChat, Conversation } from '@/hooks/useChat';
import { formatDistanceToNow } from 'date-fns';


interface ConversationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversation: Conversation) => void;
}

export const ConversationsModal: React.FC<ConversationsModalProps> = ({
  open,
  onOpenChange,
  onSelectConversation
}) => {
  const { conversations, loading, closeConversation } = useChat();

  const handleCloseConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await closeConversation(conversationId);
    if (success) {
      // Conversation will be updated via real-time subscription
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    onSelectConversation(conversation);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[500px]">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-muted-foreground text-sm">
                  Start chatting with sellers to see your conversations here.
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleConversationClick(conversation)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conversation.other_user_username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {conversation.other_user_username || 'Unknown User'}
                        </h4>
                        {conversation.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { 
                              addSuffix: true
                            })}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {conversation.product_title}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={conversation.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {conversation.status}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(conversation.created_at).toLocaleDateString('en-US')}
                            </span>
                          </div>
                        </div>
                        {conversation.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleCloseConversation(conversation.id, e)}
                            title="Close Chat"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};