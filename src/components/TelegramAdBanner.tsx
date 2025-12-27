import { useState, useEffect, useCallback } from 'react';
import telegramBanner from '@/assets/telegram-ad-banner.jpg';
import telegramBanner2 from '@/assets/telegram-ad-banner-2.jpg';
import telegramBanner3 from '@/assets/telegram-ad-banner-3.jpg';
import telegramBanner4 from '@/assets/telegram-ad-banner-4.jpg';
import telegramBanner5 from '@/assets/telegram-ad-banner-5.jpg';
import telegramBanner6 from '@/assets/telegram-ad-banner-6.jpg';

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
  {
    id: '4',
    image: telegramBanner4,
    link: 'https://t.me/DeutschrapLeakzz1Backup',
  },
  {
    id: '5',
    image: telegramBanner5,
    link: 'https://t.me/niggacafe',
  },
  {
    id: '6',
    image: telegramBanner6,
    link: 'https://t.me/Liquidforallofus',
  },
];

const TelegramAdBanner = () => {
  const [shuffledAds] = useState(() => {
    const shuffled = [...ads];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultipleAds = shuffledAds.length > 1;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % shuffledAds.length);
  }, [shuffledAds.length]);

  // Auto-scroll alle 6 Sekunden
  useEffect(() => {
    if (!hasMultipleAds) return;

    const interval = setInterval(goToNext, 6000);
    return () => clearInterval(interval);
  }, [hasMultipleAds, goToNext]);

  const currentAd = shuffledAds[currentIndex];

  return (
    <div className="mb-6">
      {/* Advertisement Label */}
      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
        <span>Advertisement</span>
        <span className="text-muted-foreground/60">— click on picture</span>
      </div>
      
      {/* Banner Container - compact size */}
      <a
        href={currentAd.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full"
      >
        <div className="relative w-full aspect-[6/1] bg-black overflow-hidden flex items-center justify-center">
          <img
            key={currentAd.id}
            src={currentAd.image}
            alt="Werbung"
            className="max-w-full max-h-full object-contain animate-fade-in"
          />
        </div>
      </a>
    </div>
  );
};

export default TelegramAdBanner;
