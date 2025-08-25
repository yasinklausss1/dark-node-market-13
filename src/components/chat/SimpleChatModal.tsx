import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, Send, X } from "lucide-react";

interface SimpleChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  sellerId?: string;
  productTitle?: string;
  sellerUsername?: string;
}

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  sender_username?: string;
}

export function SimpleChatModal({ 
  open, 
  onOpenChange, 
  productId, 
  sellerId, 
  productTitle,
  sellerUsername 
}: SimpleChatModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Setup chat when modal opens
  useEffect(() => {
    if (open && user && productId && sellerId) {
      initializeChat();
    }
  }, [open, user, productId, sellerId]);

  const initializeChat = async () => {
    if (!user || !productId || !sellerId) return;

    try {
      // Create a simple message thread identifier
      const threadId = `${productId}_${user.id}_${sellerId}`;
      setConversationId(threadId);
      
      // Load existing messages (simulate with local storage for now)
      const existingMessages = localStorage.getItem(`chat_${threadId}`);
      if (existingMessages) {
        setMessages(JSON.parse(existingMessages));
      }

      // Setup realtime subscription for future implementation
      const channel = supabase
        .channel(`chat_${threadId}`)
        .on('broadcast', { event: 'message' }, (payload) => {
          const newMsg = payload.payload as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || !conversationId) return;

    setLoading(true);
    try {
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        message: newMessage.trim(),
        sender_id: user.id,
        created_at: new Date().toISOString(),
        sender_username: user.email?.split('@')[0] || 'User'
      };

      // Add message to local state
      const updatedMessages = [...messages, newMsg];
      setMessages(updatedMessages);

      // Save to localStorage (temporary solution)
      localStorage.setItem(`chat_${conversationId}`, JSON.stringify(updatedMessages));

      // Broadcast message via realtime
      await supabase.channel(`chat_${conversationId}`).send({
        type: 'broadcast',
        event: 'message',
        payload: newMsg
      });

      setNewMessage("");
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };



  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearChat = () => {
    if (conversationId) {
      localStorage.removeItem(`chat_${conversationId}`);
      setMessages([]);
      toast({
        title: "Chat cleared",
        description: "All messages have been cleared.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">{user?.id === sellerId ? 'Conversation with customer' : `Chat with ${sellerUsername || 'Seller'}`}</h3>
                <p className="text-sm text-muted-foreground">{productTitle}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[500px]">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-70">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                disabled={loading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={loading || !newMessage.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </p>
              <Badge variant="outline" className="text-xs">
                {messages.length} messages
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}