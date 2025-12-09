import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  className?: string;
}

export const OrderImageUpload: React.FC<OrderImageUploadProps> = ({
  images,
  onChange,
  maxImages = 5,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast({
        title: "Zu viele Bilder",
        description: `Maximal ${maxImages} Bilder erlaubt.`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Datei zu groß",
          description: `${file.name} ist größer als 5MB.`,
          variant: "destructive"
        });
        continue;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Ungültiger Dateityp",
          description: `${file.name} ist keine Bilddatei.`,
          variant: "destructive"
        });
        continue;
      }

      try {
        // Generate unique filename with user folder
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'anonymous';
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('order-attachments')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          toast({
            title: "Upload fehlgeschlagen",
            description: error.message,
            variant: "destructive"
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('order-attachments')
          .getPublicUrl(data.path);

        newImages.push(urlData.publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
      toast({
        title: "Hochgeladen",
        description: `${newImages.length} Bild(er) erfolgreich hochgeladen.`
      });
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Bild ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {images.length < maxImages && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Wird hochgeladen...
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4 mr-2" />
              Bild hinzufügen ({images.length}/{maxImages})
            </>
          )}
        </Button>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
