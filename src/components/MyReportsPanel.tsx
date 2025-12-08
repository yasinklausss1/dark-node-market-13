import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  MessageCircle, 
  Check, 
  X, 
  Clock,
  ChevronLeft,
  Send,
  Image,
  User,
  Maximize2
} from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  reported_seller_id: string;
  reason: string;
  custom_note: string | null;
  evidence_image_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  seller_username?: string;
}

interface ReportMessage {
  id: string;
  report_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender_username?: string;
}

const MyReportsPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyReports();
    }
  }, [user]);

  const fetchMyReports = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('seller_reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch seller usernames
      const sellerIds = new Set(data?.map(r => r.reported_seller_id) || []);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', Array.from(sellerIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]));

      const reportsWithUsernames = data?.map(report => ({
        ...report,
        seller_username: profileMap.get(report.reported_seller_id) || 'Unbekannt'
      })) || [];

      setReports(reportsWithUsernames);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (reportId: string) => {
    const { data, error } = await supabase
      .from('report_messages')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const senderIds = new Set(data?.map(m => m.sender_id) || []);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', Array.from(senderIds));

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]));

    const messagesWithUsernames = data?.map(msg => ({
      ...msg,
      sender_username: profileMap.get(msg.sender_id) || 'Unbekannt'
    })) || [];

    setMessages(messagesWithUsernames);
  };

  const selectReport = (report: Report) => {
    setSelectedReport(report);
    fetchMessages(report.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedReport || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('report_messages')
        .insert({
          report_id: selectedReport.id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_admin: false
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedReport.id);
    } catch (error: any) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />In Bearbeitung</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><Check className="h-3 w-3 mr-1" />Gelöst</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="text-muted-foreground"><X className="h-3 w-3 mr-1" />Abgewiesen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Meine Meldungen</span>
          {reports.filter(r => r.status === 'pending').length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {reports.filter(r => r.status === 'pending').length} Offen
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Verfolge den Status deiner eingereichten Meldungen
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {selectedReport ? (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedReport(null)}
              className="mb-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück zur Liste
            </Button>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">
                    Meldung gegen @{selectedReport.seller_username}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedReport.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
                {getStatusBadge(selectedReport.status)}
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Dein Grund:</p>
                <p className="text-sm">{selectedReport.reason}</p>
                {selectedReport.custom_note && (
                  <>
                    <p className="text-sm font-medium mt-3 mb-1">Deine Notiz:</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.custom_note}</p>
                  </>
                )}
              </div>

              {selectedReport.evidence_image_url && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Image className="h-4 w-4" />
                    Dein Beweis-Bild:
                  </p>
                  <div className="relative group">
                    <img 
                      src={selectedReport.evidence_image_url} 
                      alt="Beweis" 
                      className="max-w-full h-auto max-h-48 rounded-lg border cursor-pointer"
                      onClick={() => setFullscreenImage(selectedReport.evidence_image_url)}
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFullscreenImage(selectedReport.evidence_image_url)}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  Kommunikation mit Support
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Noch keine Nachrichten. Ein Admin wird sich bald melden.
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`p-3 rounded-lg ${
                          msg.is_admin 
                            ? 'bg-primary/10 mr-4' 
                            : 'bg-muted ml-4'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3 w-3" />
                          <span className="text-xs font-medium">
                            {msg.is_admin ? 'Support' : 'Du'}
                            {msg.is_admin && <Badge variant="secondary" className="ml-1 text-xs">Admin</Badge>}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {selectedReport.status === 'pending' && (
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Nachricht an Support..."
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {selectedReport.status !== 'pending' && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Diese Meldung wurde {selectedReport.status === 'resolved' ? 'gelöst' : 'abgewiesen'}.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reports.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                Du hast noch keine Meldungen eingereicht.
              </p>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => selectReport(report)}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm">
                      @{report.seller_username}
                    </span>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {report.reason}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(report.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>

      {/* Fullscreen Image Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          {fullscreenImage && (
            <img 
              src={fullscreenImage} 
              alt="Beweis Vollansicht" 
              className="w-full h-full object-contain max-h-[90vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MyReportsPanel;