import React from 'react';
import watermarkPattern from '@/assets/watermark-pattern.png';

interface WatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  watermarkText?: string;
  className?: string;
}

export const WatermarkedImage: React.FC<WatermarkedImageProps> = ({
  src,
  alt,
  watermarkText = "oracle-market.store",
  className = "",
  ...props
}) => {
  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt={alt}
        className={className}
        {...props}
      />
      <div 
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          backgroundImage: `url(${watermarkPattern})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '512px 512px',
          opacity: 0.5,
          mixBlendMode: 'overlay'
        }}
      />
    </div>
  );
};
