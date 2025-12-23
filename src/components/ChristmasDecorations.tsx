import { useEffect, useState } from 'react';

const Snowflake = ({ style }: { style: React.CSSProperties }) => (
  <div
    className="fixed pointer-events-none text-white/60 dark:text-white/40 z-50 select-none"
    style={style}
  >
    ❄
  </div>
);

export const ChristmasDecorations = () => {
  const [snowflakes, setSnowflakes] = useState<Array<{
    id: number;
    left: number;
    animationDuration: number;
    animationDelay: number;
    fontSize: number;
    opacity: number;
  }>>([]);

  useEffect(() => {
    // Generate snowflakes
    const flakes = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 8 + Math.random() * 12,
      animationDelay: Math.random() * 5,
      fontSize: 8 + Math.random() * 16,
      opacity: 0.3 + Math.random() * 0.5,
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <>
      {/* Falling snowflakes */}
      {snowflakes.map((flake) => (
        <Snowflake
          key={flake.id}
          style={{
            left: `${flake.left}%`,
            fontSize: `${flake.fontSize}px`,
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration}s linear ${flake.animationDelay}s infinite`,
          }}
        />
      ))}

      {/* Christmas corner decoration - top left */}
      <div className="fixed top-0 left-0 z-40 pointer-events-none select-none">
        <div className="text-2xl sm:text-3xl p-2 sm:p-3 opacity-80">
          🎄
        </div>
      </div>

      {/* Christmas corner decoration - top right */}
      <div className="fixed top-0 right-0 z-40 pointer-events-none select-none">
        <div className="text-2xl sm:text-3xl p-2 sm:p-3 opacity-80">
          🎅
        </div>
      </div>

      {/* Subtle garland/lights effect at top */}
      <div className="fixed top-0 left-0 right-0 h-1 z-40 pointer-events-none overflow-hidden">
        <div className="flex justify-around items-center h-full animate-pulse">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#ff0000', '#00ff00', '#ffcc00', '#ff6600', '#00ccff'][i % 5],
                animationDelay: `${i * 0.2}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};
