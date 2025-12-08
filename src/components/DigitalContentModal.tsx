import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DigitalContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderItemId: string;
  productTitle: string;
  currentContent: string | null;
  onContentSaved: () => void;
}

const DigitalContentModal: React.FC<DigitalContentModalProps> = ({
  open,
  onOpenChange,
  orderItemId,
  productTitle,
  currentContent,
  onContentSaved
}) => {
  const { toast } = useToast();
  const [content, setContent] = useState(currentContent || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Inhalt erforderlich",
        description: "Bitte gib den digitalen Inhalt ein.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    
    const { error } = await supabase
      .from('order_items')
      .update({ 
        digital_content: content,
        digital_content_delivered_at: new Date().toISOString()
      })
      .eq('id', orderItemId);

    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Gespeichert",
        description: "Der digitale Inhalt wurde an den Käufer übermittelt."
      });
      onContentSaved();
      onOpenChange(false);
    }

    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Digitalen Inhalt liefern</DialogTitle>
          <DialogDescription>
            Gib den digitalen Inhalt für "{productTitle}" ein. Der Käufer sieht diesen Inhalt sofort nach dem Speichern.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="digitalContent">Inhalt (Codes, Links, Account-Daten, etc.)</Label>
            <Textarea
              id="digitalContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="z.B. Benutzername: user123&#10;Passwort: pass456&#10;&#10;Oder Download-Link: https://..."
              rows={6}
              className="mt-2 font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Wird gespeichert...' : 'Inhalt senden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DigitalContentModal;
