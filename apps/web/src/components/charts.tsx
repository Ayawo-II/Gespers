"use client";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

export function PieChart({
  title,
  slices,
  size = 170,
}: {
  title: string;
  slices: PieSlice[];
  size?: number;
}) {
  const total = slices.reduce((n, s) => n + s.value, 0);

  // Filter slices with value > 0
  const activeSlices = slices.filter((s) => s.value > 0);

  let cumulativeAngle = 0;
  const radius = 64;
  const center = 85;
  const strokeWidth = 34;

  return (
    <div>
      <h3 style={{ marginBottom: 14, color: "var(--navy)", fontSize: "16px", fontWeight: 700 }}>
        {title}
      </h3>
      <div className="pie-wrap">
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <svg viewBox="0 0 170 170" width={size} height={size}>
            {total === 0 ? (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="var(--line)"
                strokeWidth={strokeWidth}
              />
            ) : activeSlices.length === 1 ? (
              // Single slice 100% full circle
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={activeSlices[0].color}
                strokeWidth={strokeWidth}
              />
            ) : (
              activeSlices.map((slice, idx) => {
                const fraction = slice.value / total;
                const angle = fraction * 360;
                const startAngle = cumulativeAngle;
                cumulativeAngle += angle;
                const endAngle = cumulativeAngle;

                const startRad = (startAngle - 90) * (Math.PI / 180);
                const endRad = (endAngle - 90) * (Math.PI / 180);

                const x1 = center + radius * Math.cos(startRad);
                const y1 = center + radius * Math.sin(startRad);
                const x2 = center + radius * Math.cos(endRad);
                const y2 = center + radius * Math.sin(endRad);

                const largeArcFlag = angle > 180 ? 1 : 0;

                const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

                return (
                  <path
                    key={idx}
                    d={pathData}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                  />
                );
              })
            )}
          </svg>
          <div className="pie-hole">
            <strong>{total}</strong>
            <span>agents</span>
          </div>
        </div>
        <ul className="pie-legend">
          {slices.map((s) => (
            <li key={s.label}>
              <span
                className="pie-swatch"
                style={{ background: s.color, border: "1px solid rgba(0,0,0,0.15)" }}
              />
              <span className="pie-label" style={{ fontWeight: 600 }}>
                {s.label}
              </span>
              <span className="pie-num" style={{ fontWeight: 700 }}>
                {s.value} <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12 }}>({total ? Math.round((s.value / total) * 100) : 0}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
