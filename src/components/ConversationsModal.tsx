import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Clock, User, X } from 'lucide-react';
import { useChat, Conversation } from '@/hooks/useChat';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';


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

  const getStatusLabel = (status: string) => {
    return status === 'active' ? 'aktiv' : 'geschlossen';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Nachrichten
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[500px]">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Nachrichten werden geladen...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Noch keine Nachrichten</h3>
                <p className="text-muted-foreground text-sm">
                  Starte einen Chat mit Verkäufern, um deine Nachrichten hier zu sehen.
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
                          {conversation.other_user_username || 'Unbekannter Nutzer'}
                        </h4>
                        {conversation.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { 
                              addSuffix: true,
                              locale: de
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
                            {getStatusLabel(conversation.status)}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(conversation.created_at).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </div>
                        {conversation.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleCloseConversation(conversation.id, e)}
                            title="Chat schließen"
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
            <span>{conversations.length} Nachricht{conversations.length !== 1 ? 'en' : ''}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};