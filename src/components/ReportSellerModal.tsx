import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Upload, X } from 'lucide-react';

interface ReportSellerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  sellerUsername: string;
}

const REPORT_REASONS = [
  { value: 'scam', label: 'Betrug / Scam' },
  { value: 'fake_product', label: 'Gefälschtes Produkt' },
  { value: 'no_delivery', label: 'Nicht geliefert' },
  { value: 'wrong_product', label: 'Falsches Produkt geliefert' },
  { value: 'poor_quality', label: 'Schlechte Qualität' },
  { value: 'harassment', label: 'Belästigung / Beleidigung' },
  { value: 'suspicious', label: 'Verdächtiges Verhalten' },
  { value: 'other', label: 'Sonstiges' }
];

const ReportSellerModal: React.FC<ReportSellerModalProps> = ({
  open,
  onOpenChange,
  sellerId,
  sellerUsername
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Datei zu groß",
          description: "Maximale Dateigröße ist 5MB",
          variant: "destructive"
        });
        return;
      }
      setEvidenceFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setEvidenceFile(null);
    setEvidencePreview(null);
  };

  const handleSubmit = async () => {
    if (!user || !reason) {
      toast({
        title: "Fehler",
        description: "Bitte wähle einen Grund aus",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let evidenceUrl = null;

      // Upload evidence if provided
      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('report-evidence')
          .upload(fileName, evidenceFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('report-evidence')
            .getPublicUrl(fileName);
          evidenceUrl = publicUrl;
        }
      }

      // Create report
      const { error } = await supabase
        .from('seller_reports')
        .insert({
          reporter_id: user.id,
          reported_seller_id: sellerId,
          reason: REPORT_REASONS.find(r => r.value === reason)?.label || reason,
          custom_note: customNote || null,
          evidence_image_url: evidenceUrl
        });

      if (error) throw error;

      toast({
        title: "Meldung gesendet",
        description: "Deine Meldung wurde an die Admins weitergeleitet."
      });

      // Reset form
      setReason('');
      setCustomNote('');
      setEvidenceFile(null);
      setEvidencePreview(null);
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: "Fehler",
        description: error.message || "Meldung konnte nicht gesendet werden",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Verkäufer melden: @{sellerUsername}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Grund der Meldung *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Wähle einen Grund..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Eigene Notiz (optional)</Label>
            <Textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Beschreibe das Problem genauer..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {customNote.length}/1000
            </p>
          </div>

          <div className="space-y-2">
            <Label>Beweis-Bild (optional)</Label>
            {evidencePreview ? (
              <div className="relative">
                <img 
                  src={evidencePreview} 
                  alt="Beweis" 
                  className="w-full h-40 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Klicke zum Hochladen</span>
                <span className="text-xs text-muted-foreground">Max. 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!reason || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Wird gesendet...' : 'Melden'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportSellerModal;