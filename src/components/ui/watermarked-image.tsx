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
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            rgba(255, 255, 255, 0.03) 100px,
            rgba(255, 255, 255, 0.03) 200px
          )`,
          mixBlendMode: 'overlay'
        }}
      >
        <svg 
          className="w-full h-full" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            opacity: 0.15
          }}
        >
          <defs>
            <pattern 
              id="watermark-pattern" 
              x="0" 
              y="0" 
              width="300" 
              height="200" 
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-35)"
            >
              <text
                x="0"
                y="40"
                fill="white"
                fontSize="16"
                fontWeight="500"
                fontFamily="system-ui, -apple-system, sans-serif"
                opacity="0.8"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="100"
                fill="white"
                fontSize="16"
                fontWeight="500"
                fontFamily="system-ui, -apple-system, sans-serif"
                opacity="0.8"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="160"
                fill="white"
                fontSize="16"
                fontWeight="500"
                fontFamily="system-ui, -apple-system, sans-serif"
                opacity="0.8"
              >
                {watermarkText}
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#watermark-pattern)" />
        </svg>
      </div>
    </div>
  );
};
