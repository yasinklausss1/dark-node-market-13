import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MessageSquare, Clock, CheckCircle, Upload, X, Image } from "lucide-react";

interface DisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
  orderDetails?: any;
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  priority: string;
  created_at: string;
  resolution?: string;
  dispute_messages: Array<{
    id: string;
    message: string;
    sender_id: string;
    is_admin: boolean;
    created_at: string;
  }>;
}

// Dispute reason templates (German)
const DISPUTE_TEMPLATES = [
  { value: "defective_product", label: "Defektes Produkt", text: "Das Produkt, das ich erhalten habe, ist defekt oder beschädigt. Es funktioniert nicht wie beschrieben oder erwartet." },
  { value: "not_as_described", label: "Nicht wie beschrieben", text: "Das Produkt entspricht nicht der Beschreibung oder den Bildern in der Anzeige." },
  { value: "wrong_item", label: "Falscher Artikel erhalten", text: "Ich habe einen anderen Artikel erhalten als den, den ich bestellt habe." },
  { value: "missing_parts", label: "Fehlende Teile", text: "Dem Produkt fehlen wesentliche Teile oder Zubehör, die enthalten sein sollten." },
  { value: "delivery_issues", label: "Lieferprobleme", text: "Es gab Probleme mit der Lieferung meiner Bestellung (verzögert, beim Versand beschädigt, etc.)." },
  { value: "quality_issues", label: "Qualitätsprobleme", text: "Die Qualität des Produkts ist deutlich niedriger als erwartet basierend auf der Beschreibung und dem Preis." },
  { value: "seller_communication", label: "Verkäufer-Kommunikation", text: "Der Verkäufer antwortet nicht auf meine Nachrichten oder weigert sich, das Problem zu lösen." },
  { value: "refund_request", label: "Erstattungsanfrage", text: "Ich möchte aufgrund der beschriebenen Probleme eine Rückerstattung für diese Bestellung beantragen." },
  { value: "not_received", label: "Nicht erhalten", text: "Ich habe das Produkt/die digitale Ware nicht erhalten." },
  { value: "custom", label: "Sonstiges", text: "" }
];

export function DisputeModal({ open, onOpenChange, orderId, orderDetails }: DisputeModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [existingDispute, setExistingDispute] = useState<Dispute | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploadedEvidence, setUploadedEvidence] = useState<string[]>([]);

  useEffect(() => {
    if (open && orderId) {
      checkExistingDispute();
    }
  }, [open, orderId]);

  const checkExistingDispute = async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          dispute_messages (*)
        `)
        .eq('order_id', orderId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking dispute:', error);
        return;
      }

      if (data) {
        setExistingDispute(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const createDispute = async () => {
    if (!orderId || !reason.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Grund für den Dispute an",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Nicht angemeldet');

      // Upload evidence files if any
      let evidenceUrls: string[] = [];
      if (evidenceFiles.length > 0) {
        evidenceUrls = await uploadEvidence(session.user.id);
      }

      // Get seller ID from order
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            product_id,
            products (seller_id)
          )
        `)
        .eq('id', orderId)
        .single();

      if (!orderData) throw new Error('Order not found');

      const sellerId = orderData.order_items[0]?.products?.seller_id;
      if (!sellerId) throw new Error('Seller not found');

      const { error } = await supabase
        .from('disputes')
        .insert({
          order_id: orderId,
          plaintiff_id: session.user.id,
          defendant_id: sellerId,
          reason: reason.trim(),
          status: 'open',
          priority: 'medium',
          evidence_files: evidenceUrls
        });

      if (error) throw error;

      toast({
        title: "Dispute erstellt",
        description: "Dein Dispute wurde eingereicht und wird von unserem Team geprüft.",
      });

      setReason("");
      setSelectedTemplate("");
      setEvidenceFiles([]);
      await checkExistingDispute();
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast({
        title: "Fehler",
        description: "Dispute konnte nicht erstellt werden. Bitte versuche es erneut.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (value: string) => {
    setSelectedTemplate(value);
    const template = DISPUTE_TEMPLATES.find(t => t.value === value);
    if (template && template.text) {
      setReason(template.text);
    } else {
      setReason("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        toast({
          title: "Ungültiger Dateityp",
          description: "Nur Bilder und PDF-Dateien sind erlaubt",
          variant: "destructive",
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "Datei zu groß",
          description: "Dateien müssen kleiner als 5MB sein",
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    setEvidenceFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadEvidence = async (userId: string) => {
    const uploadedUrls: string[] = [];
    
    for (const file of evidenceFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('dispute-evidence')
        .upload(fileName, file);
      
      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload ${file.name}`);
      }
      
      uploadedUrls.push(fileName);
    }
    
    return uploadedUrls;
  };

  const sendMessage = async () => {
    if (!existingDispute || !newMessage.trim()) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Nicht angemeldet');

      const { error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: existingDispute.id,
          sender_id: session.user.id,
          message: newMessage.trim(),
          is_admin: false
        });

      if (error) throw error;

      setNewMessage("");
      await checkExistingDispute();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive';
      case 'in_progress':
        return 'default';
      case 'resolved':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {existingDispute ? 'Dispute-Details' : 'Dispute erstellen'}
          </DialogTitle>
        </DialogHeader>

        {existingDispute ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Dispute #{existingDispute.id.slice(0, 8)}</span>
                  <Badge variant={getStatusColor(existingDispute.status)} className="flex items-center gap-1">
                    {getStatusIcon(existingDispute.status)}
                    {existingDispute.status.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Grund:</strong> {existingDispute.reason}</p>
                  <p><strong>Priorität:</strong> {existingDispute.priority}</p>
                  <p><strong>Erstellt:</strong> {new Date(existingDispute.created_at).toLocaleDateString('de-DE')}</p>
                  {existingDispute.resolution && (
                    <p><strong>Lösung:</strong> {existingDispute.resolution}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nachrichten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {existingDispute.dispute_messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg border ${
                      message.is_admin 
                        ? 'bg-primary/10 border-primary/20' 
                        : 'bg-muted border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={message.is_admin ? 'default' : 'outline'}>
                        {message.is_admin ? 'Admin' : 'Benutzer'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleString('de-DE')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{message.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {existingDispute.status !== 'closed' && existingDispute.status !== 'resolved' && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Schreibe deine Nachricht..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                  Nachricht senden
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Erstelle einen Dispute für Bestellung #{orderId?.slice(0, 8)}, wenn du Probleme mit deinem Kauf hast.
              </p>
              
              {/* Template Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Wähle eine Vorlage (Optional)</label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle einen häufigen Dispute-Grund..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPUTE_TEMPLATES.map((template) => (
                      <SelectItem key={template.value} value={template.value}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Reason Text Area */}
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">Grund für den Dispute</label>
                <Textarea
                  placeholder="Bitte beschreibe das Problem ausführlich..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Evidence Upload Section */}
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">Beweise hochladen (Optional)</label>
                <p className="text-xs text-muted-foreground">
                  Lade Fotos, Screenshots oder PDF-Dokumente hoch, um deinen Dispute zu unterstützen (max. 5MB pro Datei)
                </p>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Dateien auswählen
                </Button>

                {/* Display Selected Files */}
                {evidenceFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Ausgewählte Dateien:</p>
                    {evidenceFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded border">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createDispute} disabled={loading || !reason.trim()}>
                {loading ? 'Wird erstellt...' : 'Dispute erstellen'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}