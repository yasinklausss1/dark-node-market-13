import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import telegramBanner from '@/assets/telegram-ad-banner.jpg';
import telegramBanner2 from '@/assets/telegram-ad-banner-2.jpg';

interface AdItem {
  id: string;
  image: string;
  link: string;
  description: string;
}

const ads: AdItem[] = [
  {
    id: '1',
    image: telegramBanner,
    link: 'https://t.me/+BJSbVCkJgloyYWI6',
    description: 'In dieser Gruppe sind nur zuverlässige und vertrauenswürdige Verkäufer vertreten, sodass ihr euch auf faire und sichere Geschäfte verlassen könnt.'
  },
  {
    id: '2',
    image: telegramBanner2,
    link: 'https://t.me/+S0FF6yqfO8U5MTcy',
    description: 'BTW guys I also run a channel where I drop fresh accounts, streaming accounts, methods, and other useful stuff. If you want updates, drops, and exclusive things before anyone else — make sure you join.'
  },
];

const TelegramAdBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultipleAds = ads.length > 1;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  }, []);

  // Auto-scroll alle 5 Sekunden
  useEffect(() => {
    if (!hasMultipleAds) return;

    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [hasMultipleAds, goToNext]);

  const currentAd = ads[currentIndex];

  return (
    <div className="mb-6 relative">
      {/* Werbung Container */}
      <div className="relative rounded-xl overflow-hidden border-2 border-white">
        <a
          href={currentAd.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:opacity-95 transition-opacity"
        >
          {/* Trust Text Header */}
          <div className="bg-black/70 backdrop-blur-sm px-4 py-3">
            <p className="text-center text-xs md:text-sm text-white/90 leading-relaxed">
              {currentAd.description}
            </p>
          </div>

          {/* Banner Image */}
          <img
            src={currentAd.image}
            alt="Werbung"
            className="w-full h-auto object-cover"
          />
        </a>

        {/* Werbung Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white uppercase tracking-wider z-10">
          Werbung
        </div>

        {/* Navigation Arrows - nur bei mehreren Werbungen */}
        {hasMultipleAds && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                goToPrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-all z-10"
              aria-label="Vorherige Werbung"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                goToNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-all z-10"
              aria-label="Nächste Werbung"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots Indicator - nur bei mehreren Werbungen */}
        {hasMultipleAds && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-4'
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Werbung ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramAdBanner;
