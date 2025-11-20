import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useChat, Conversation } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Search, Send, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  delivered_at: string | null;
  read_at: string | null;
}

export default function Messages() {
  const { user } = useAuth();
  const { conversations, loading } = useChat();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.other_user_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.product_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      
      // Setup realtime subscription
      const channel = supabase
        .channel(`messages_${selectedConversation.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation]);

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);

    // Mark messages as read with read_at timestamp
    if (user) {
      const unreadMessages = data?.filter(
        (msg) => !msg.is_read && msg.sender_id !== user.id
      );

      if (unreadMessages && unreadMessages.length > 0) {
        await supabase
          .from('chat_messages')
          .update({ 
            is_read: true,
            read_at: new Date().toISOString()
          })
          .in('id', unreadMessages.map((msg) => msg.id));
      }
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_read: false
        });

      if (error) throw error;

      setNewMessage('');
      
      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Please log in to view messages</h2>
          <a href="/auth?tab=signin">
            <Button>Log In</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,50%,8%)] to-[hsl(240,50%,6%)]">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/marketplace')}
            className="text-white hover:bg-[hsl(240,45%,18%)]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
        
        <div className="flex gap-4 h-[calc(100vh-180px)]">
          {/* Conversations List */}
          <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-gradient-to-b from-[hsl(240,45%,12%)] to-[hsl(240,45%,10%)] border border-[hsl(240,40%,20%)] rounded-lg flex-col`}>
            <div className="p-4 border-b border-[hsl(240,40%,20%)] flex-shrink-0">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages
              </h2>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[hsl(240,30%,70%)]" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white placeholder:text-[hsl(240,30%,60%)]"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(280,70%,60%)] mx-auto"></div>
                  <p className="text-[hsl(240,30%,70%)] mt-4 text-sm">Loading...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-[hsl(240,30%,50%)]" />
                  <p className="text-[hsl(240,30%,70%)] text-sm">
                    {searchTerm ? 'No conversations found' : 'No conversations yet'}
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                        selectedConversation?.id === conversation.id
                          ? 'bg-gradient-to-r from-[hsl(280,70%,60%)] to-[hsl(270,70%,55%)]'
                          : 'bg-[hsl(240,45%,15%)] hover:bg-[hsl(240,45%,18%)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className={`${
                            selectedConversation?.id === conversation.id
                              ? 'bg-white/20 text-white'
                              : 'bg-[hsl(280,70%,60%)]/20 text-[hsl(280,70%,60%)]'
                          }`}>
                            {conversation.other_user_username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm truncate text-white">
                              {conversation.other_user_username || 'Unknown User'}
                            </h4>
                            {conversation.last_message_at && (
                              <span className="text-xs text-white/70">
                                {formatDistanceToNow(new Date(conversation.last_message_at), { 
                                  addSuffix: true
                                })}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-white/60 truncate">
                            {conversation.product_title}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t border-[hsl(240,40%,20%)] flex-shrink-0">
              <p className="text-xs text-[hsl(240,30%,70%)] text-center">
                {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 bg-gradient-to-b from-[hsl(240,45%,12%)] to-[hsl(240,45%,10%)] border border-[hsl(240,40%,20%)] rounded-lg flex-col`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-[hsl(240,40%,20%)] flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden text-white hover:bg-[hsl(240,45%,18%)]"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[hsl(280,70%,60%)]/20 text-[hsl(280,70%,60%)]">
                        {selectedConversation.other_user_username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-semibold text-white">{selectedConversation.other_user_username}</h3>
                      <p className="text-xs text-[hsl(240,30%,70%)]">{selectedConversation.product_title}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 min-h-0">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-[hsl(240,30%,50%)]" />
                        <p className="text-[hsl(240,30%,70%)]">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender_id === user?.id
                                ? 'bg-gradient-to-r from-[hsl(280,70%,60%)] to-[hsl(270,70%,55%)] text-white'
                                : 'bg-[hsl(240,45%,15%)] text-white'
                            }`}
                          >
                            <p className="text-sm break-words">{message.message}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-xs opacity-70">
                                {new Date(message.created_at).toLocaleTimeString('de-DE', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {message.sender_id === user?.id && (
                                <span className="opacity-70">
                                  {message.read_at ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                  ) : message.delivered_at ? (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-[hsl(240,40%,20%)] flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sendingMessage}
                      className="flex-1 bg-[hsl(240,45%,15%)] border-[hsl(240,40%,25%)] text-white placeholder:text-[hsl(240,30%,60%)]"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="bg-gradient-to-r from-[hsl(280,70%,60%)] to-[hsl(270,70%,55%)] hover:from-[hsl(280,70%,65%)] hover:to-[hsl(270,70%,60%)]"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-[hsl(240,30%,70%)] mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-[hsl(240,30%,50%)]" />
                  <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                  <p className="text-[hsl(240,30%,70%)]">Choose a conversation from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
