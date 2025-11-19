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
              width="200" 
              height="120" 
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-35)"
            >
              <text
                x="0"
                y="20"
                fill="white"
                fontSize="12"
                fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
                opacity="1"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="50"
                fill="white"
                fontSize="12"
                fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
                opacity="1"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="80"
                fill="white"
                fontSize="12"
                fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
                opacity="1"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="110"
                fill="white"
                fontSize="12"
                fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
                opacity="1"
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
