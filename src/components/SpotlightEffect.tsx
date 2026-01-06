import React, { useEffect, useState } from 'react';

export const SpotlightEffect: React.FC = () => {
  const [position, setPosition] = useState({ x: 20, y: 30 });

  useEffect(() => {
    // Slow ambient movement
    const interval = setInterval(() => {
      setPosition({
        x: 15 + Math.random() * 70,
        y: 20 + Math.random() * 60,
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Primary spotlight */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px] transition-all duration-[8000ms] ease-in-out"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, hsl(316 13% 47%) 0%, transparent 70%)',
        }}
      />
      
      {/* Secondary smaller spotlight */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[100px] transition-all duration-[10000ms] ease-in-out"
        style={{
          left: `${100 - position.x}%`,
          top: `${100 - position.y}%`,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, hsl(316 15% 55%) 0%, transparent 70%)',
        }}
      />

      {/* Subtle lens flare accent */}
      <div
        className="absolute w-[200px] h-[200px] rounded-full opacity-[0.03] blur-[60px] transition-all duration-[6000ms] ease-in-out"
        style={{
          left: `${position.x + 20}%`,
          top: `${position.y - 10}%`,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, hsl(316 20% 60%) 0%, transparent 60%)',
        }}
      />
    </div>
  );
};
