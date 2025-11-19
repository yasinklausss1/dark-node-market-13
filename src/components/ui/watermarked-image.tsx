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
          mixBlendMode: 'normal'
        }}
      >
        <svg 
          className="w-full h-full" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            opacity: 0.5
          }}
        >
          <defs>
            <pattern 
              id="watermark-pattern" 
              x="0" 
              y="0" 
              width="180" 
              height="120" 
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-40)"
            >
              <text
                x="0"
                y="15"
                fill="white"
                fontSize="13"
                fontWeight="500"
                fontFamily="Arial, Helvetica, sans-serif"
                opacity="1"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="40"
                fill="white"
                fontSize="13"
                fontWeight="500"
                fontFamily="Arial, Helvetica, sans-serif"
                opacity="1"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="65"
                fill="white"
                fontSize="13"
                fontWeight="500"
                fontFamily="Arial, Helvetica, sans-serif"
                opacity="1"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="90"
                fill="white"
                fontSize="13"
                fontWeight="500"
                fontFamily="Arial, Helvetica, sans-serif"
                opacity="1"
              >
                {watermarkText}
              </text>
              <text
                x="0"
                y="115"
                fill="white"
                fontSize="13"
                fontWeight="500"
                fontFamily="Arial, Helvetica, sans-serif"
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
