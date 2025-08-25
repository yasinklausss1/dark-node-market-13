import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Share2, Send, MessageCircle, Bot, ExternalLink, Copy } from "lucide-react";

interface TelegramIntegrationProps {
  productId?: string;
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
  sellerUsername?: string;
  orderId?: string;
}

export function TelegramIntegration({
  productId,
  productTitle,
  productPrice,
  productImage,
  sellerUsername,
  orderId
}: TelegramIntegrationProps) {
  const { toast } = useToast();
  const [customMessage, setCustomMessage] = useState("");
  const [botUsername, setBotUsername] = useState("");

  const generateProductUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/marketplace${productId ? `?product=${productId}` : ''}`;
  };

  const shareToTelegram = (customText?: string) => {
    const productUrl = generateProductUrl();
    const defaultText = productTitle 
      ? `🛍️ Check out this product: ${productTitle}${productPrice ? ` - €${productPrice}` : ''}`
      : 'Check out this marketplace!';
    
    const text = customText || customMessage || defaultText;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
    
    window.open(telegramUrl, '_blank');
    
    toast({
      title: "Shared to Telegram",
      description: "Link has been opened in Telegram",
    });
  };

  const shareToTelegramChannel = () => {
    if (!botUsername) {
      toast({
        title: "Bot Username Required",
        description: "Please enter a Telegram bot username",
        variant: "destructive",
      });
      return;
    }

    const productUrl = generateProductUrl();
    const text = customMessage || `🛍️ New Product Alert: ${productTitle}${productPrice ? ` - €${productPrice}` : ''}`;
    const telegramBotUrl = `https://t.me/${botUsername}?start=share&text=${encodeURIComponent(text)}&url=${encodeURIComponent(productUrl)}`;
    
    window.open(telegramBotUrl, '_blank');
    
    toast({
      title: "Shared to Bot",
      description: "Message sent to Telegram bot",
    });
  };

  const copyTelegramLink = () => {
    const productUrl = generateProductUrl();
    navigator.clipboard.writeText(productUrl);
    
    toast({
      title: "Link Copied",
      description: "Product link copied to clipboard",
    });
  };

  const notifyOrderUpdate = () => {
    if (!orderId) return;
    
    const text = `📦 Order Update: Your order #${orderId.slice(0, 8)} has been updated. Check the marketplace for details.`;
    const marketplaceUrl = `${window.location.origin}/orders`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(marketplaceUrl)}&text=${encodeURIComponent(text)}`;
    
    window.open(telegramUrl, '_blank');
  };

  const joinTelegramGroup = () => {
    // This would be your marketplace's official Telegram group
    const groupUrl = 'https://t.me/your_marketplace_group';
    window.open(groupUrl, '_blank');
  };

  const quickShareTemplates = [
    {
      icon: "🔥",
      text: "Hot Deal Alert! Limited time offer on this amazing product!",
      label: "Hot Deal"
    },
    {
      icon: "⭐",
      text: "Highly recommended product! Check out this quality item.",
      label: "Recommended"
    },
    {
      icon: "💰",
      text: "Great value for money! Don't miss this opportunity.",
      label: "Best Value"
    },
    {
      icon: "🆕",
      text: "New arrival! Fresh product just added to the marketplace.",
      label: "New Product"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Quick Share Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => shareToTelegram()}
          className="flex items-center gap-2 bg-[#0088cc] hover:bg-[#0088cc]/90"
        >
          <Send className="h-4 w-4" />
          Share to Telegram
        </Button>

        {orderId && (
          <Button
            variant="outline"
            size="sm"
            onClick={notifyOrderUpdate}
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Notify Order
          </Button>
        )}
      </div>
    </div>
  );
}