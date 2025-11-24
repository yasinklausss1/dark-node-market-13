import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Image as ImageIcon } from 'lucide-react';
import { downloadImage, formatFansignFilename } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface FansignImageDisplayProps {
  imageUrl?: string | null;
  uploadedAt?: string | null;
  orderId: string;
}

export const FansignImageDisplay: React.FC<FansignImageDisplayProps> = ({
  imageUrl,
  uploadedAt,
  orderId
}) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const handleDownload = async () => {
    if (!imageUrl) return;

    setDownloading(true);
    try {
      const filename = formatFansignFilename(orderId);
      await downloadImage(imageUrl, filename);
      
      toast({
        title: "Download gestartet",
        description: "Das Fansign-Bild wird heruntergeladen."
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download fehlgeschlagen",
        description: "Bitte versuche es erneut.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  if (!imageUrl) {
    return (
      <Card className="p-6 text-center">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Noch kein Fansign hochgeladen
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Der Verkäufer wird dein Fansign bald hochladen.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card 
        className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setShowFullImage(!showFullImage)}
      >
        <img
          src={imageUrl}
          alt="Fansign"
          className={`w-full object-contain ${showFullImage ? 'max-h-none' : 'max-h-64'}`}
        />
      </Card>

      <div className="flex items-center justify-between gap-2">
        {uploadedAt && (
          <p className="text-xs text-muted-foreground">
            Hochgeladen: {format(new Date(uploadedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
          </p>
        )}
        <Button
          onClick={handleDownload}
          disabled={downloading}
          size="sm"
          className="ml-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {downloading ? 'Wird heruntergeladen...' : 'Herunterladen'}
        </Button>
      </div>
    </div>
  );
};
