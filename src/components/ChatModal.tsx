import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, X, Clock } from 'lucide-react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';


interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  sellerId?: string;
  productTitle?: string;
  sellerUsername?: string;
  conversationId?: string; // Add this for existing conversations
  conversationStatus?: string; // Add conversation status
  onBackToConversations?: () => void; // Add callback to go back to conversations
}

export const ChatModal: React.FC<ChatModalProps> = ({
  open,
  onOpenChange,
  productId,
  sellerId,
  productTitle,
  sellerUsername,
  conversationId: existingConversationId,
  conversationStatus = 'active',
  onBackToConversations
}) => {
  const { user } = useAuth();
  const { createOrGetConversation, sendMessage, fetchMessages, messages } = useChat();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages[conversationId || '']]);

  // Initialize conversation
  useEffect(() => {
    if (open && productId && sellerId && user) {
      // If we already have a conversation ID from the seller dashboard, use it
      if (existingConversationId) {
        setConversationId(existingConversationId);
        fetchMessages(existingConversationId);
      } else {
        initializeChat();
      }
    }
  }, [open, productId, sellerId, existingConversationId]);

  // Ensure messages load for existing conversations even if product/seller props change
  useEffect(() => {
    if (open && existingConversationId) {
      setConversationId(existingConversationId);
      fetchMessages(existingConversationId);
    }
  }, [open, existingConversationId]);

  const initializeChat = async () => {
    if (!productId || !sellerId) return;

    setLoading(true);
    try {
      const convId = await createOrGetConversation(sellerId, productId);
      if (convId) {
        setConversationId(convId);
        await fetchMessages(convId);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!conversationId || !newMessage.trim() || loading) return;

    setLoading(true);
    try {
      const success = await sendMessage(conversationId, newMessage);
      if (success) {
        setNewMessage('');
        await fetchMessages(conversationId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentMessages = conversationId ? messages[conversationId] || [] : [];

  return (
    <Dialog open={open} onOpenChange={onBackToConversations || onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl max-h-[80vh] p-0 bg-gradient-to-b from-background to-background/95">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {sellerUsername?.charAt(0).toUpperCase() || 'S'}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg">
                  {user?.id === sellerId ? 'Conversation with customer' : `Chat with ${sellerUsername || 'Seller'}`}
                </DialogTitle>
                <p className="text-sm text-muted-foreground line-clamp-1">{productTitle}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[500px]">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {loading && currentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading conversation...</p>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">Start the conversation!</h3>
                  <p className="text-muted-foreground">
                    Send a message to the seller about this product.
                  </p>
                </div>
              ) : (
                currentMessages.map((message, index) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const showTimestamp = index === 0 || 
                    new Date(message.created_at).getTime() - new Date(currentMessages[index - 1].created_at).getTime() > 300000; // 5 minutes

                  return (
                    <div key={message.id}>
                      {showTimestamp && (
                        <div className="flex items-center justify-center my-4">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(message.created_at), { 
                              addSuffix: true
                            })}
                          </Badge>
                        </div>
                      )}
                      
                      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] group ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                          <div
                            className={`rounded-2xl p-4 shadow-sm transition-all duration-200 ${
                              isOwnMessage
                                ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground ml-4'
                                : 'bg-muted/80 backdrop-blur-sm mr-4'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{message.message}</p>
                            
                            <div className="flex items-center justify-between mt-2 opacity-70">
                              <span className="text-xs">
                                 {new Date(message.created_at).toLocaleTimeString('en-US', {
                                   hour: '2-digit',
                                   minute: '2-digit'
                                 })}
                              </span>
                            </div>
                          </div>
                          
                          {!isOwnMessage && (
                            <div className="flex items-center gap-2 mt-1 ml-4">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-muted">
                                  {message.sender_username?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {message.sender_username}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted/80 rounded-2xl p-4 mr-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          {conversationStatus === 'active' ? (
            <div className="p-4 border-t bg-gradient-to-r from-background/95 to-background">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    className="pr-12 bg-background/50 border-border/50 focus:border-primary/50"
                  />
                  {newMessage.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Badge variant="outline" className="text-xs">
                        {newMessage.length}
                      </Badge>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleSendMessage} 
                  disabled={loading || !newMessage.trim()}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </p>
                <Badge variant="outline" className="text-xs">
                  {currentMessages.length} messages
                </Badge>
              </div>
            </div>
          ) : (
            <div className="p-6 border-t bg-gradient-to-r from-muted/20 to-muted/10">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Chat Closed</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  This conversation has been closed. You can still read all previous messages, but new messages cannot be sent.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};