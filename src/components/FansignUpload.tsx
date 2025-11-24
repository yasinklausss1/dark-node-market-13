import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FansignUploadProps {
  orderId: string;
  currentImageUrl?: string | null;
  onUploadSuccess: (url: string) => void;
}

export const FansignUpload: React.FC<FansignUploadProps> = ({
  orderId,
  currentImageUrl,
  onUploadSuccess
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Bitte wähle eine Bilddatei (JPG, PNG, WEBP).",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Bitte wähle ein Bild kleiner als 5MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Generate filename with order ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('fansign-images')
        .upload(fileName, file, {
          upsert: true
        });

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload fehlgeschlagen",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('fansign-images')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      // Update order with fansign image URL
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          fansign_image_url: publicUrl,
          fansign_uploaded_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Update error:', updateError);
        toast({
          title: "Aktualisierung fehlgeschlagen",
          description: updateError.message,
          variant: "destructive"
        });
        return;
      }

      setPreviewUrl(publicUrl);
      onUploadSuccess(publicUrl);

      toast({
        title: "Fansign hochgeladen",
        description: "Das Bild wurde erfolgreich hochgeladen."
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Fehler beim Upload",
        description: "Bitte versuche es erneut.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          fansign_image_url: null,
          fansign_uploaded_at: null
        })
        .eq('id', orderId);

      if (error) throw error;

      setPreviewUrl(null);
      onUploadSuccess('');

      toast({
        title: "Bild entfernt",
        description: "Das Fansign-Bild wurde entfernt."
      });
    } catch (error) {
      console.error('Remove failed:', error);
      toast({
        title: "Fehler",
        description: "Bild konnte nicht entfernt werden.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Wird hochgeladen...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {previewUrl ? 'Bild ersetzen' : 'Fansign hochladen'}
            </>
          )}
        </Button>
        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {previewUrl && (
        <Card className="overflow-hidden">
          <img
            src={previewUrl}
            alt="Fansign Vorschau"
            className="w-full h-auto object-contain max-h-64"
          />
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
