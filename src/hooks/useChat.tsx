import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  sender_username?: string;
}

export interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  status: string;
  order_id?: string;
  product_title?: string;
  other_user_username?: string;
}

export const useChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = useState(false);

  // Fetch user's conversations
  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Fetching conversations for user:', user.id);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      console.log('Found conversations:', data?.length || 0);

      // Get product and profile info separately
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv: any) => {
          // Get product info
          const { data: product } = await supabase
            .from('products')
            .select('title')
            .eq('id', conv.product_id)
            .single();

          // Get buyer profile
          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', conv.buyer_id)
            .single();

          // Get seller profile
          const { data: sellerProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', conv.seller_id)
            .single();

          return {
            ...conv,
            product_title: product?.title || 'Unknown Product',
            other_user_username: conv.buyer_id === user.id 
              ? sellerProfile?.username 
              : buyerProfile?.username
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    if (!user) return;

    try {
      console.log('Fetching messages for conversation:', conversationId);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      console.log('Found messages:', data?.length || 0);

      // Get sender usernames separately
      const messagesWithUsernames = await Promise.all(
        (data || []).map(async (msg: any) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender_username: senderProfile?.username || 'Unknown User'
          };
        })
      );

      setMessages(prev => ({
        ...prev,
        [conversationId]: messagesWithUsernames
      }));

      // Mark messages as read
      if (messagesWithUsernames.length > 0) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Create or get conversation
  const createOrGetConversation = async (sellerId: string, productId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      console.log('Creating/getting conversation:', { sellerId, productId, buyerId: user.id });
      
      // Try to find existing conversation using maybeSingle
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .eq('product_id', productId)
        .maybeSingle();

      if (findError) {
        console.error('Error finding conversation:', findError);
        throw findError;
      }

      if (existing) {
        console.log('Found existing conversation:', existing.id);
        return existing.id;
      }

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          product_id: productId,
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        throw createError;
      }

      console.log('Created new conversation:', newConv.id);
      await fetchConversations();
      return newConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Send message
  const sendMessage = async (conversationId: string, message: string): Promise<boolean> => {
    if (!user || !message.trim()) return false;

    try {
      console.log('Sending message:', { conversationId, message: message.trim() });
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message: message.trim()
        });

      if (error) {
        console.error('Error inserting message:', error);
        throw error;
      }

      // Update conversation timestamp
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ 
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Error updating conversation:', updateError);
      }

      console.log('Message sent successfully');
      
      // Refresh messages to show the new one
      await fetchMessages(conversationId);
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          console.log('New message received:', newMessage);
          
          // Get sender username
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', newMessage.sender_id)
            .single();
          
          const messageWithUsername = {
            ...newMessage,
            sender_username: senderProfile?.username || 'Unknown User'
          };
          
          setMessages(prev => ({
            ...prev,
            [newMessage.conversation_id]: [
              ...(prev[newMessage.conversation_id] || []),
              messageWithUsername
            ]
          }));
        }
      )
      .subscribe();

    // Subscribe to conversation updates
    const conversationsChannel = supabase
      .channel('chat-conversations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          console.log('Conversation updated, refreshing...');
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setMessages({});
    }
  }, [user]);

  return {
    conversations,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    createOrGetConversation,
    sendMessage,
    closeConversation: async (conversationId: string) => {
      const { error } = await supabase.rpc('close_conversation', { 
        conversation_uuid: conversationId 
      });
      if (!error) {
        await fetchConversations();
      }
      return !error;
    }
  };
};