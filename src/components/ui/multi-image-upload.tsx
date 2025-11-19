import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MultiImageUploadProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  className?: string;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  images,
  onChange,
  maxImages = 5,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast({
        title: "Zu viele Bilder",
        description: `Sie können maximal ${maxImages} Bilder hochladen.`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
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
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          toast({
            title: "Upload fehlgeschlagen",
            description: `${file.name}: ${error.message}`,
            variant: "destructive"
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: "Upload fehlgeschlagen",
          description: `${file.name} konnte nicht hochgeladen werden.`,
          variant: "destructive"
        });
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls]);
      toast({
        title: "Bilder hochgeladen",
        description: `${uploadedUrls.length} Bild(er) erfolgreich hochgeladen.`
      });
    }

    setUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Wird hochgeladen...' : 'Bilder auswählen'}
        </Button>
        <span className="text-sm text-muted-foreground">
          {images.length}/{maxImages}
        </span>
      </div>
      
      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group aspect-square bg-muted rounded-lg overflow-hidden">
              <img
                src={url}
                alt={`Produktbild ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Noch keine Bilder hochgeladen</p>
        </div>
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
