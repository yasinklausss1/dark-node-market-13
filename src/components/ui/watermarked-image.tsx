import React from 'react';

interface WatermarkedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  watermarkText?: string;
  className?: string;
}

export const WatermarkedImage: React.FC<WatermarkedImageProps> = ({
  src,
  alt,
  watermarkText = "Oracle Market",
  className = "",
  ...props
}) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <img
        src={src}
        alt={alt}
        className={className}
        {...props}
      />
      <div 
        className="absolute top-1/2 left-1/2 pointer-events-none select-none"
        style={{
          transform: 'translate(-50%, -50%) rotate(-25deg)',
        }}
      >
        <div
          className="font-cinzel text-white font-bold text-4xl md:text-6xl lg:text-7xl whitespace-nowrap"
          style={{
            opacity: 0.15,
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
            letterSpacing: '0.1em',
          }}
        >
          {watermarkText}
        </div>
      </div>
    </div>
  );
};
