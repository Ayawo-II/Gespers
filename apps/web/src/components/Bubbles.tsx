"use client";

import { useCallback, useRef, useState } from "react";

const LOGO_SRC = "/radio_lome.jpg";

type Bulle = {
  id: number;
  size: number;
  left: number;
  bottom: number;
  rise: number;
  sway: number;
  duration: number;
  delay: number;
};

type Particule = { dx: number; dy: number; delay: number };

type Eclatement = {
  id: number;
  size: number;
  left: number;
  bottom: number;
  particules: Particule[];
};

const MAX_BULLES = 18;
const BULLES_MAX = 60;
const DUREE_ECLATEMENT = 700;
const APPARITION_ECLATE = 1400;

function creerBulle(id: number): Bulle {
  return {
    id,
    size: 12 + ((id * 37) % 84),
    left: 4 + ((id * 29) % 72),
    bottom: 4 + ((id * 17) % 66),
    rise: -(26 + ((id * 13) % 44)),
    sway: (id % 2 === 0 ? 1 : -1) * (10 + ((id * 11) % 26)),
    duration: 3.5 + ((id * 7) % 4),
    delay: (id * 0.9) % 12,
  };
}

export function Bubbles() {
  const [bulles, setBulles] = useState<Bulle[]>(() =>
    Array.from({ length: MAX_BULLES }, (_, i) => creerBulle(i)),
  );
  const [eclatements, setEclatements] = useState<Eclatement[]>([]);
  const prochainId = useRef(MAX_BULLES);

  const eclater = useCallback((bulle: Bulle) => {
    setBulles((prev) => prev.filter((b) => b.id !== bulle.id));

    const particules: Particule[] = Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2 + (bulle.id % 9) * 0.35;
      const distance = 24 + ((bulle.id * 5 + i * 9) % 36);
      return {
        dx: Math.round(Math.cos(angle) * distance),
        dy: Math.round(Math.sin(angle) * distance),
        delay: (i * 14) % 70,
      };
    });

    setEclatements((prev) => [...prev, { id: bulle.id, size: bulle.size, left: bulle.left, bottom: bulle.bottom, particules }]);

    setTimeout(() => {
      setEclatements((prev) => prev.filter((e) => e.id !== bulle.id));
    }, DUREE_ECLATEMENT);

    setTimeout(() => {
      const id = prochainId.current++;
      setBulles((prev) => (prev.length < BULLES_MAX ? [...prev, creerBulle(id)] : prev));
    }, APPARITION_ECLATE);
  }, []);

  return (
    <div className="bubbles">
      {bulles.map((b) => (
        <span
          key={b.id}
          className="bubble-slot"
          style={{ left: `${b.left}%`, bottom: `${b.bottom}%` }}
        >
          <button
            type="button"
            className="bubble"
            aria-label="Faire éclater la bulle"
            onClick={() => eclater(b)}
            style={
              {
                width: b.size,
                height: b.size,
                "--rise": `${b.rise}px`,
                "--sway": `${b.sway}px`,
                animationDuration: `${b.duration}s`,
                animationDelay: `${b.delay}s`,
              } as React.CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bubble-logo" src={LOGO_SRC} alt="" aria-hidden="true" />
          </button>
        </span>
      ))}

      {eclatements.map((e) => (
        <span
          key={`eclat-${e.id}`}
          className="bubble-slot"
          style={{ left: `${e.left}%`, bottom: `${e.bottom}%` }}
        >
          <span className="bubble-ring" style={{ width: e.size, height: e.size }} />
          <span className="bubble-pop" style={{ width: e.size, height: e.size }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bubble-logo" src={LOGO_SRC} alt="" aria-hidden="true" />
          </span>
          {e.particules.map((p, i) => (
            <span
              key={i}
              className="bubble-particle"
              style={
                {
                  left: e.size / 2,
                  bottom: e.size / 2,
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                  animationDelay: `${p.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      ))}
    </div>
  );
}
