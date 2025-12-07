import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MultiFileUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  className?: string;
  accept?: string;
  maxFiles?: number;
  minFiles?: number;
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  value = [],
  onChange,
  className = '',
  accept = 'image/*',
  maxFiles = 10,
  minFiles = 1
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed maxFiles
    if (value.length + files.length > maxFiles) {
      toast({
        title: "Zu viele Bilder",
        description: `Maximal ${maxFiles} Bilder erlaubt.`,
        variant: "destructive"
      });
      return;
    }

    const newUrls: string[] = [];

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

        newUrls.push(urlData.publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls]);
      toast({
        title: "Bilder hochgeladen",
        description: `${newUrls.length} Bild(er) erfolgreich hochgeladen.`
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= value.length) return;
    const newUrls = [...value];
    const [movedItem] = newUrls.splice(fromIndex, 1);
    newUrls.splice(toIndex, 0, movedItem);
    onChange(newUrls);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={value.length >= maxFiles}
        >
          <Upload className="h-4 w-4 mr-2" />
          Bilder hinzufügen
        </Button>
        <span className="text-sm text-muted-foreground">
          {value.length}/{maxFiles} Bilder (min. {minFiles})
        </span>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, index) => (
            <div 
              key={url} 
              className="relative group aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border"
            >
              <img
                src={url}
                alt={`Bild ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Order badge */}
              <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                {index + 1}
              </div>
              
              {/* Controls overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {index > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveImage(index, index - 1)}
                    title="Nach vorne"
                  >
                    ←
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemove(index)}
                  title="Entfernen"
                >
                  <X className="h-4 w-4" />
                </Button>
                {index < value.length - 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveImage(index, index + 1)}
                    title="Nach hinten"
                  >
                    →
                  </Button>
                )}
              </div>
              
              {/* First image indicator */}
              {index === 0 && (
                <div className="absolute bottom-1 left-1 right-1 bg-primary/90 text-primary-foreground text-xs py-0.5 text-center rounded">
                  Hauptbild
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Mindestens {minFiles} Bild erforderlich</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
