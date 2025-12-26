import { useState, useEffect, useCallback } from 'react';
import telegramBanner from '@/assets/telegram-ad-banner.jpg';
import telegramBanner2 from '@/assets/telegram-ad-banner-2.jpg';
import telegramBanner3 from '@/assets/telegram-ad-banner-3.jpg';

interface AdItem {
  id: string;
  image: string;
  link: string;
}

const ads: AdItem[] = [
  {
    id: '1',
    image: telegramBanner,
    link: 'https://t.me/+BJSbVCkJgloyYWI6',
  },
  {
    id: '2',
    image: telegramBanner2,
    link: 'https://t.me/+S0FF6yqfO8U5MTcy',
  },
  {
    id: '3',
    image: telegramBanner3,
    link: 'https://t.me/+XRli37DPxRljZWRi',
  },
];

const TelegramAdBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultipleAds = ads.length > 1;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  }, []);

  // Auto-scroll alle 10 Sekunden
  useEffect(() => {
    if (!hasMultipleAds) return;

    const interval = setInterval(goToNext, 6000);
    return () => clearInterval(interval);
  }, [hasMultipleAds, goToNext]);

  const currentAd = ads[currentIndex];

  return (
    <div className="mb-6">
      {/* Werbung Label */}
      <div className="text-xs text-muted-foreground mb-1">
        Werbung
      </div>
      
      {/* Banner Container */}
      <a
        href={currentAd.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        <img
          key={currentAd.id}
          src={currentAd.image}
          alt="Werbung"
          className="w-full h-auto object-contain animate-fade-in"
        />
      </a>
    </div>
  );
};

export default TelegramAdBanner;
