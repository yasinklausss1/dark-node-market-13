import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle,
  ShieldCheck,
  Send,
  Download,
  Image as ImageIcon,
  Search,
  RefreshCw,
  Users,
  Euro,
  Calendar,
  ArrowLeft,
  Undo2,
  Ban
} from 'lucide-react';

interface Dispute {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  priority: string;
  resolution: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  plaintiff_id: string;
  defendant_id: string;
  admin_assigned: string | null;
  evidence_files?: string[];
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
  const { isModeratorOrAdmin } = useUserRole();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [partialRefundPercent, setPartialRefundPercent] = useState<number>(50);

  useEffect(() => {
    if (isModeratorOrAdmin) {
      fetchDisputes();
    }
  }, [isModeratorOrAdmin]);

  useEffect(() => {
    if (selectedDispute) {
      fetchMessages(selectedDispute.id);
    }
  }, [selectedDispute]);

  const fetchDisputes = async () => {
    setRefreshing(true);
    try {
      // Fetch disputes
      const { data: disputesData, error: disputesError } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (disputesError) throw disputesError;

      if (!disputesData || disputesData.length === 0) {
        setDisputes([]);
        setRefreshing(false);
        return;
      }

      // Get all unique user IDs
      const userIds = new Set<string>();
      const orderIds = new Set<string>();
      disputesData.forEach(d => {
        userIds.add(d.plaintiff_id);
        userIds.add(d.defendant_id);
        orderIds.add(d.order_id);
      });

      // Fetch profiles for all users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', Array.from(userIds));

      // Fetch orders for totals
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total_amount_eur')
        .in('id', Array.from(orderIds));

      // Create lookup maps
      const profileMap = new Map(profilesData?.map(p => [p.user_id, p.username]) || []);
      const orderMap = new Map(ordersData?.map(o => [o.id, o.total_amount_eur]) || []);

      // Get message counts for each dispute
      const disputesWithDetails: Dispute[] = [];
      for (const dispute of disputesData) {
        const { count } = await supabase
          .from('dispute_messages')
          .select('*', { count: 'exact', head: true })
          .eq('dispute_id', dispute.id);

        disputesWithDetails.push({
          ...dispute,
          plaintiff_username: profileMap.get(dispute.plaintiff_id) || 'Unbekannt',
          defendant_username: profileMap.get(dispute.defendant_id) || 'Unbekannt',
          order_total: orderMap.get(dispute.order_id) || 0,
          message_count: count || 0
        });
      }

      setDisputes(disputesWithDetails);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast({
        title: "Fehler",
        description: "Disputes konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchMessages = async (disputeId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('dispute_messages')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Get unique sender IDs
      const senderIds = new Set(messagesData.map(m => m.sender_id));
      
      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', Array.from(senderIds));

      const profileMap = new Map(profilesData?.map(p => [p.user_id, p.username]) || []);

      const messagesWithSender = messagesData.map(message => ({
        ...message,
        sender_username: profileMap.get(message.sender_id) || 'Unbekannt',
      }));

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
          is_admin: true
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(selectedDispute.id);
      
      toast({
        title: "Nachricht gesendet",
        description: "Deine Nachricht wurde zum Dispute hinzugefügt."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDisputeStatus = async (status: string) => {
    if (!selectedDispute) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          status,
          updated_at: new Date().toISOString(),
          admin_assigned: user!.id
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      toast({
        title: "Status aktualisiert",
        description: `Dispute wurde auf "${getStatusLabel(status)}" gesetzt.`
      });

      await fetchDisputes();
      setSelectedDispute(prev => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveDispute = async (
    resolutionType: 'buyer_favor' | 'seller_favor' | 'partial' | 'dismissed'
  ) => {
    if (!selectedDispute || !resolution.trim()) {
      toast({
        title: "Begründung erforderlich",
        description: "Bitte gib eine Begründung für die Entscheidung an.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current session to pass authorization
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Nicht eingeloggt. Bitte neu anmelden.');
      }

      const { data, error, response } = await supabase.functions.invoke('resolve-dispute', {
        body: {
          disputeId: selectedDispute.id,
          resolutionType,
          resolutionNote: resolution.trim(),
          partialPercent: partialRefundPercent,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        let serverError: string | undefined;

        try {
          if (response instanceof Response) {
            const raw = await response.clone().text();
            // try json first
            try {
              const parsed = JSON.parse(raw);
              serverError = parsed?.error || parsed?.message || raw;
            } catch {
              serverError = raw;
            }
          }
        } catch {
          // ignore
        }

        throw new Error(serverError || (error instanceof Error ? error.message : 'Dispute konnte nicht verarbeitet werden.'));
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Dispute konnte nicht verarbeitet werden.');
      }

      const status = resolutionType === 'dismissed' ? 'dismissed' : 'resolved';
      const actionMessage =
        resolutionType === 'buyer_favor'
          ? 'Käufer hat die Krypto-Rückerstattung erhalten.'
          : resolutionType === 'seller_favor'
          ? 'Verkäufer hat die Krypto-Auszahlung erhalten.'
          : resolutionType === 'partial'
          ? `Aufgeteilt: ${partialRefundPercent}% Käufer / ${100 - partialRefundPercent}% Verkäufer.`
          : '';

      toast({
        title: status === 'dismissed' ? 'Dispute abgelehnt' : 'Dispute gelöst',
        description: `${actionMessage}`.trim() || 'Erfolgreich gespeichert.',
      });

      setSelectedDispute(null);
      setResolution('');
      await fetchDisputes();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Dispute konnte nicht gelöst werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Offen';
      case 'in_progress': return 'In Bearbeitung';
      case 'resolved': return 'Gelöst';
      case 'dismissed': return 'Abgelehnt';
      default: return status;
    }
  };

  const getResolutionLabel = (type: string) => {
    switch (type) {
      case 'buyer_favor': return 'Zugunsten Käufer';
      case 'seller_favor': return 'Zugunsten Verkäufer';
      case 'partial': return 'Teilweise Erstattung';
      case 'dismissed': return 'Abgelehnt';
      default: return type;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'resolved': return 'secondary';
      case 'dismissed': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return priority;
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
        title: "Download fehlgeschlagen",
        description: "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive"
      });
    }
  };

  // Filter disputes
  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = searchTerm === '' || 
      dispute.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.plaintiff_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.defendant_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || dispute.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Stats
  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    inProgress: disputes.filter(d => d.status === 'in_progress').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    dismissed: disputes.filter(d => d.status === 'dismissed').length
  };

  if (!isModeratorOrAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Zugriff verweigert. Nur Administratoren und Moderatoren können Disputes verwalten.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-500">{stats.open}</p>
                <p className="text-xs text-muted-foreground">Offen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Bearbeitung</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
                <p className="text-xs text-muted-foreground">Gelöst</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.dismissed}</p>
                <p className="text-xs text-muted-foreground">Abgelehnt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Dispute-Verwaltung
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDisputes}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedDispute ? (
            <div className="space-y-6">
              {/* Dispute Header */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDispute(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    Dispute #{selectedDispute.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-muted-foreground ml-10">
                    <Users className="h-3 w-3 inline mr-1" />
                    {selectedDispute.plaintiff_username} vs {selectedDispute.defendant_username}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getPriorityVariant(selectedDispute.priority)}>
                    {getPriorityLabel(selectedDispute.priority)}
                  </Badge>
                  <Badge variant={getStatusVariant(selectedDispute.status)} className="flex items-center gap-1">
                    {getStatusIcon(selectedDispute.status)}
                    {getStatusLabel(selectedDispute.status)}
                  </Badge>
                </div>
              </div>

              {/* Quick Actions */}
              {selectedDispute.status === 'open' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateDisputeStatus('in_progress')}
                    disabled={loading}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    In Bearbeitung nehmen
                  </Button>
                </div>
              )}

              {/* Dispute Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Grund
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedDispute.reason}</p>
                </div>
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Euro className="h-3 w-3" /> Bestellwert
                  </p>
                  <p className="text-sm text-muted-foreground">€{selectedDispute.order_total?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Erstellt
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedDispute.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Nachrichten
                  </p>
                  <p className="text-sm text-muted-foreground">{messages.length}</p>
                </div>
              </div>

              {/* Evidence Files */}
              {selectedDispute.evidence_files && selectedDispute.evidence_files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Beweise ({selectedDispute.evidence_files.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDispute.evidence_files.map((filePath, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-background"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">
                            {filePath.split('/').pop() || `Beweis ${index + 1}`}
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
                  Kommunikation
                </h4>
                <div className="max-h-80 overflow-y-auto space-y-3 border rounded-lg p-4">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Noch keine Nachrichten
                    </p>
                  ) : (
                    messages.map((message) => (
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
                            {new Date(message.created_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Send Message */}
                {(selectedDispute.status === 'open' || selectedDispute.status === 'in_progress') && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Nachricht als Admin schreiben..."
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
              {(selectedDispute.status === 'open' || selectedDispute.status === 'in_progress') && (
                <div className="space-y-4 border-t pt-6">
                  <h4 className="font-medium">Dispute lösen</h4>
                  <Textarea
                    placeholder="Begründung für die Entscheidung eingeben..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                  />
                  
                  {/* Partial Refund Percentage */}
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Teilweise Erstattung</span>
                      <span className="text-sm text-muted-foreground">
                        Käufer: {partialRefundPercent}% | Verkäufer: {100 - partialRefundPercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-green-600 w-16">Käufer</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={partialRefundPercent}
                        onChange={(e) => setPartialRefundPercent(Number(e.target.value))}
                        className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-xs text-blue-600 w-16 text-right">Verkäufer</span>
                    </div>
                    {selectedDispute.order_total && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>€{((selectedDispute.order_total * partialRefundPercent) / 100).toFixed(2)} an Käufer</span>
                        <span>€{((selectedDispute.order_total * (100 - partialRefundPercent)) / 100).toFixed(2)} an Verkäufer</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      onClick={() => resolveDispute('buyer_favor')}
                      disabled={loading || !resolution.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      100% Käufer
                    </Button>
                    <Button
                      onClick={() => resolveDispute('seller_favor')}
                      disabled={loading || !resolution.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      100% Verkäufer
                    </Button>
                    <Button
                      onClick={() => resolveDispute('partial')}
                      disabled={loading || !resolution.trim()}
                      variant="secondary"
                    >
                      <Euro className="h-4 w-4 mr-2" />
                      {partialRefundPercent}/{100 - partialRefundPercent}
                    </Button>
                    <Button
                      onClick={() => resolveDispute('dismissed')}
                      disabled={loading || !resolution.trim()}
                      variant="destructive"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Ablehnen
                    </Button>
                  </div>
                </div>
              )}

              {selectedDispute.resolution && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Entscheidung</h4>
                  <p className="text-sm text-muted-foreground">{selectedDispute.resolution}</p>
                  {selectedDispute.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Gelöst am {new Date(selectedDispute.resolved_at).toLocaleString('de-DE')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Suche nach ID, Benutzer oder Grund..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="open">Offen</SelectItem>
                    <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                    <SelectItem value="resolved">Gelöst</SelectItem>
                    <SelectItem value="dismissed">Abgelehnt</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priorität" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Prioritäten</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Disputes List */}
              {filteredDisputes.length === 0 ? (
                <div className="text-center py-12">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {disputes.length === 0 ? 'Keine Disputes vorhanden' : 'Keine Disputes gefunden'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDisputes.map((dispute) => (
                    <div
                      key={dispute.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDispute(dispute)}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">#{dispute.id.slice(0, 8)}</span>
                            <Badge variant={getPriorityVariant(dispute.priority)} className="text-xs">
                              {getPriorityLabel(dispute.priority)}
                            </Badge>
                            <Badge variant={getStatusVariant(dispute.status)} className="flex items-center gap-1 text-xs">
                              {getStatusIcon(dispute.status)}
                              {getStatusLabel(dispute.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {dispute.plaintiff_username} vs {dispute.defendant_username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {dispute.reason}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">€{dispute.order_total?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(dispute.created_at).toLocaleDateString('de-DE')}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {dispute.message_count}
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