import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  images: string[];
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  className = '',
  aspectRatio = 'video'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]'
  };

  const goToNext = useCallback(() => {
    if (isTransitioning || images.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [images.length, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (isTransitioning || images.length <= 1) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [images.length, isTransitioning]);

  const goToIndex = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentIndex, isTransitioning]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  if (images.length === 0) {
    return (
      <div className={cn("bg-muted rounded-lg flex items-center justify-center", aspectClasses[aspectRatio], className)}>
        <span className="text-muted-foreground">Kein Bild verfügbar</span>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", aspectClasses[aspectRatio], className)}>
        <img
          src={images[0]}
          alt="Produktbild"
          className="w-full h-full object-cover pointer-events-none select-none"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative group", className)}>
      {/* Main Image */}
      <div className={cn("relative bg-muted rounded-lg overflow-hidden", aspectClasses[aspectRatio])}>
        <img
          src={images[currentIndex]}
          alt={`Produktbild ${currentIndex + 1}`}
          className={cn(
            "w-full h-full object-cover pointer-events-none select-none transition-opacity duration-300",
            isTransitioning && "opacity-80"
          )}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />

        {/* Navigation Arrows */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          onClick={goToPrev}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          onClick={goToNext}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Image counter */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail Navigation */}
      <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-thin">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => goToIndex(index)}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all",
              index === currentIndex 
                ? "border-primary ring-2 ring-primary/30" 
                : "border-transparent hover:border-muted-foreground/50"
            )}
          >
            <img
              src={image}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover pointer-events-none"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          </button>
        ))}
      </div>

      {/* Dot indicators for mobile */}
      <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
        {images.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goToIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentIndex 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  );
};
