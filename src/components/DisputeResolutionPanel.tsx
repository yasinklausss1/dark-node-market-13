import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  ShieldCheck,
  Send,
  Download,
  Image as ImageIcon
} from 'lucide-react';

interface Dispute {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  priority: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  plaintiff_id: string;
  defendant_id: string;
  admin_assigned: string | null;
  evidence_files?: string[];
  // Related data
  plaintiff_username?: string;
  defendant_username?: string;
  order_total?: number;
  message_count?: number;
}

interface DisputeMessage {
  id: string;
  message: string;
  sender_id: string;
  is_admin: boolean;
  created_at: string;
  sender_username?: string;
}

export function DisputeResolutionPanel() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDisputes();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedDispute) {
      fetchMessages(selectedDispute.id);
    }
  }, [selectedDispute]);

  const fetchDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          plaintiff_profile:profiles!disputes_plaintiff_id_fkey(username),
          defendant_profile:profiles!disputes_defendant_id_fkey(username),
          order_data:orders(total_amount_eur)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const disputesWithDetails = data?.map((dispute: any) => ({
        ...dispute,
        plaintiff_username: dispute.plaintiff_profile?.username,
        defendant_username: dispute.defendant_profile?.username,
        order_total: dispute.order_data?.total_amount_eur,
        message_count: 0
      })) || [];

      // Get message counts
      for (const dispute of disputesWithDetails) {
        const { count } = await supabase
          .from('dispute_messages')
          .select('*', { count: 'exact', head: true })
          .eq('dispute_id', dispute.id);
        
        (dispute as any).message_count = count || 0;
      }

      setDisputes(disputesWithDetails);
    } catch (error) {
      console.error('Error fetching disputes:', error);
    }
  };

  const fetchMessages = async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispute_messages')
        .select(`
          *,
          sender_profile:profiles!dispute_messages_sender_id_fkey(username)
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesWithSender = data?.map((message: any) => ({
        ...message,
        sender_username: message.sender_profile?.username,
      })) || [];

      setMessages(messagesWithSender);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedDispute || !newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: selectedDispute.id,
          sender_id: user!.id,
          message: newMessage.trim(),
          is_admin: profile?.role === 'admin'
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(selectedDispute.id);
      
      toast({
        title: "Message sent",
        description: "Your message has been added to the dispute."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveDispute = async (status: 'resolved' | 'dismissed') => {
    if (!selectedDispute || !resolution.trim()) {
      toast({
        title: "Resolution required",
        description: "Please provide a resolution explanation.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          status,
          resolution: resolution.trim(),
          resolved_at: new Date().toISOString(),
          admin_assigned: user!.id
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      toast({
        title: "Dispute resolved",
        description: `The dispute has been ${status}.`
      });

      setSelectedDispute(null);
      setResolution('');
      await fetchDisputes();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast({
        title: "Error",
        description: "Failed to resolve dispute. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'resolved':
        return 'default';
      case 'dismissed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const downloadEvidence = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('dispute-evidence')
        .download(filePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'evidence';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading evidence:', error);
      toast({
        title: "Download failed",
        description: "Could not download the evidence file.",
        variant: "destructive"
      });
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Access denied. Only administrators can manage disputes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Dispute Resolution Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDispute ? (
            <div className="space-y-6">
              {/* Dispute Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Dispute #{selectedDispute.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDispute.plaintiff_username} vs {selectedDispute.defendant_username}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityVariant(selectedDispute.priority)}>
                    {selectedDispute.priority} priority
                  </Badge>
                  <Badge variant={getStatusVariant(selectedDispute.status)}>
                    {getStatusIcon(selectedDispute.status)}
                    {selectedDispute.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDispute(null)}
                  >
                    Back to List
                  </Button>
                </div>
              </div>

              {/* Dispute Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Reason</p>
                  <p className="text-sm text-muted-foreground">{selectedDispute.reason}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Order Value</p>
                  <p className="text-sm text-muted-foreground">€{selectedDispute.order_total}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedDispute.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Messages</p>
                  <p className="text-sm text-muted-foreground">{messages.length}</p>
                </div>
              </div>

              {/* Evidence Files */}
              {selectedDispute.evidence_files && selectedDispute.evidence_files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Evidence Files ({selectedDispute.evidence_files.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDispute.evidence_files.map((filePath, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-background"
                      >
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate">
                            {filePath.split('/').pop() || `Evidence ${index + 1}`}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadEvidence(filePath)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversation
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-3 border rounded-lg p-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.is_admin
                          ? 'bg-primary text-primary-foreground ml-8'
                          : 'bg-muted mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">
                          {message.is_admin ? '👮 Admin' : message.sender_username}
                        </span>
                        <span className="text-xs opacity-70">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  ))}
                </div>

                {/* Send Message */}
                {selectedDispute.status === 'open' && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={loading || !newMessage.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Resolution */}
              {selectedDispute.status === 'open' && (
                <div className="space-y-4 border-t pt-6">
                  <h4 className="font-medium">Resolution</h4>
                  <Textarea
                    placeholder="Explain your resolution decision..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => resolveDispute('resolved')}
                      disabled={loading || !resolution.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve in Favor
                    </Button>
                    <Button
                      onClick={() => resolveDispute('dismissed')}
                      disabled={loading || !resolution.trim()}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Dismiss Dispute
                    </Button>
                  </div>
                </div>
              )}

              {selectedDispute.resolution && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Final Resolution</h4>
                  <p className="text-sm text-muted-foreground">{selectedDispute.resolution}</p>
                  {selectedDispute.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Resolved on {new Date(selectedDispute.resolved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Active Disputes ({disputes.filter(d => d.status === 'open').length})</h3>
              
              {disputes.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No disputes to review</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {disputes.map((dispute) => (
                    <div
                      key={dispute.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedDispute(dispute)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">#{dispute.id.slice(0, 8)}</span>
                            <Badge variant={getPriorityVariant(dispute.priority)} className="text-xs">
                              {dispute.priority}
                            </Badge>
                            <Badge variant={getStatusVariant(dispute.status)} className="text-xs">
                              {getStatusIcon(dispute.status)}
                              {dispute.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {dispute.plaintiff_username} vs {dispute.defendant_username} • €{dispute.order_total}
                          </p>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {dispute.reason}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{new Date(dispute.created_at).toLocaleDateString()}</p>
                          <p className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {dispute.message_count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}