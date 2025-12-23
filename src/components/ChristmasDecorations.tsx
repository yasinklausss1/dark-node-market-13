import { useEffect, useState } from 'react';

const Snowflake = ({ style }: { style: React.CSSProperties }) => (
  <div
    className="fixed pointer-events-none text-white/70 dark:text-white/50 z-50 select-none"
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
    const flakes = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 10 + Math.random() * 15,
      animationDelay: Math.random() * 8,
      fontSize: 6 + Math.random() * 12,
      opacity: 0.2 + Math.random() * 0.4,
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <>
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
    </>
  );
};
