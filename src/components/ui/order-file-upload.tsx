import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileIcon, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderFileUploadProps {
  files: string[];
  onChange: (files: string[]) => void;
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

export const OrderFileUpload: React.FC<OrderFileUploadProps> = ({
  files,
  onChange,
  maxFiles = 10,
  className,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const getFileName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fullName = pathParts[pathParts.length - 1];
      // Remove UUID prefix if present (format: uuid_filename)
      const underscoreIndex = fullName.indexOf('_');
      if (underscoreIndex > 30) { // UUID is about 36 chars
        return decodeURIComponent(fullName.substring(underscoreIndex + 1));
      }
      return decodeURIComponent(fullName);
    } catch {
      return 'Datei';
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const remainingSlots = maxFiles - files.length;
    if (selectedFiles.length > remainingSlots) {
      toast({
        title: "Zu viele Dateien",
        description: `Du kannst nur noch ${remainingSlots} Datei(en) hinzufügen.`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(selectedFiles)) {
      // Max 50MB per file
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Datei zu groß",
          description: `${file.name} ist größer als 50MB.`,
          variant: "destructive"
        });
        continue;
      }

      const fileExt = file.name.split('.').pop() || 'bin';
      const fileName = `${crypto.randomUUID()}_${file.name}`;
      const filePath = `digital-content/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload fehlgeschlagen",
          description: `${file.name}: ${uploadError.message}`,
          variant: "destructive"
        });
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('order-attachments')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        newUrls.push(urlData.publicUrl);
      }
    }

    if (newUrls.length > 0) {
      onChange([...files, ...newUrls]);
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((url, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 p-2 bg-muted rounded-lg group"
            >
              <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm truncate flex-1">{getFileName(url)}</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                <Download className="h-4 w-4" />
              </a>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && files.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Hochladen...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Dateien hinzufügen ({files.length}/{maxFiles})
            </span>
          )}
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
