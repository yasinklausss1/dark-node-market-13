import React, { useState, useEffect } from 'react';
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
import { OrderImageUpload } from '@/components/ui/order-image-upload';
import { OrderFileUpload } from '@/components/ui/order-file-upload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DigitalContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderItemId: string;
  productTitle: string;
  currentContent: string | null;
  currentImages?: string[] | null;
  currentFiles?: string[] | null;
  onContentSaved: () => void;
}

const DigitalContentModal: React.FC<DigitalContentModalProps> = ({
  open,
  onOpenChange,
  orderItemId,
  productTitle,
  currentContent,
  currentImages,
  currentFiles,
  onContentSaved
}) => {
  const { toast } = useToast();
  const [content, setContent] = useState(currentContent || '');
  const [images, setImages] = useState<string[]>(currentImages || []);
  const [files, setFiles] = useState<string[]>(currentFiles || []);
  const [isSaving, setIsSaving] = useState(false);

  // Update content when currentContent or orderItemId changes
  useEffect(() => {
    setContent(currentContent || '');
    setImages(currentImages || []);
    setFiles(currentFiles || []);
  }, [currentContent, currentImages, currentFiles, orderItemId, open]);

  const handleSave = async () => {
    if (!content.trim() && images.length === 0 && files.length === 0) {
      toast({
        title: "Inhalt erforderlich",
        description: "Bitte gib den digitalen Inhalt ein, füge Bilder oder Dateien hinzu.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    
    console.log('Saving digital content for order item:', orderItemId);
    console.log('Content:', content);
    console.log('Images:', images);
    console.log('Files:', files);
    
    const { data, error } = await supabase
      .from('order_items')
      .update({ 
        digital_content: content || null,
        digital_content_images: images,
        digital_content_files: files,
        digital_content_delivered_at: new Date().toISOString()
      })
      .eq('id', orderItemId)
      .select();

    console.log('Update result:', { data, error });

    if (error) {
      console.error('Error saving digital content:', error);
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Digitalen Inhalt liefern</DialogTitle>
          <DialogDescription>
            Gib den digitalen Inhalt für "{productTitle}" ein. Der Käufer sieht diesen Inhalt sofort nach dem Speichern.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="digitalContent">Text/Codes (Codes, Links, Account-Daten, etc.)</Label>
            <Textarea
              id="digitalContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="z.B. Benutzername: user123&#10;Passwort: pass456&#10;&#10;Oder Download-Link: https://..."
              rows={6}
              className="mt-2 font-mono text-sm"
            />
          </div>
          
          <div>
            <Label>Bilder anhängen (optional)</Label>
            <OrderImageUpload
              images={images}
              onChange={setImages}
              maxImages={10}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              z.B. Screenshots, Zugangsdaten-Bilder
            </p>
          </div>

          <div>
            <Label>Dateien anhängen (optional)</Label>
            <OrderFileUpload
              files={files}
              onChange={setFiles}
              maxFiles={10}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              z.B. PDFs, ZIPs, Software, Dokumente (max. 50MB pro Datei)
            </p>
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
