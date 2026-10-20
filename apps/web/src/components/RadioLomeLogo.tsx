"use client";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  showSubtitle?: boolean;
  variant?: "full" | "mark";
}

export function RadioLomeLogo({
  width = 180,
  height,
  className = "",
  variant = "full",
}: LogoProps) {
  const computedHeight = height || (variant === "mark" ? width : Math.round((width * 270) / 300));
  const src = "/radio_lome.jpg";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={width}
      height={computedHeight}
      className={className}
      alt="Logo officiel Radio Lomé"
    />
  );
}
