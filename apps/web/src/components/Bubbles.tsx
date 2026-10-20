"use client";

export function Bubbles() {
  const bulles = Array.from({ length: 18 }, (_, i) => i);

  return (
    <div className="bubbles" aria-hidden="true">
      {bulles.map((i) => {
        const size = 14 + ((i * 37) % 90);
        const left = (i * 53) % 100;
        const delay = (i * 0.9) % 12;
        const duration = 9 + ((i * 7) % 10);
        return (
          <span
            key={i}
            className="bubble"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}
