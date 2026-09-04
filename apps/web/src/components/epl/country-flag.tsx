"use client";

import { useState } from "react";
import { flagImageUrl } from "@/lib/world-countries";

type Props = {
  iso2: string;
  emoji?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
};

// Falls back to the stored emoji (or a blank box) if the CDN image 404s or
// the network blocks it — a bare <img src> with no error handling just
// renders nothing, which reads as "flags are broken" even when the iso2
// code itself is correct.
export function CountryFlag({ iso2, emoji, width = 28, height = 20, style }: Props) {
  const [failed, setFailed] = useState(false);

  if (!iso2 || failed) {
    return emoji ? (
      <span style={{ fontSize: Math.round(height * 1.1), lineHeight: 1, ...style }}>{emoji}</span>
    ) : (
      <span
        style={{
          width,
          height,
          borderRadius: 3,
          background: "rgba(255,255,255,0.08)",
          display: "inline-block",
          ...style,
        }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagImageUrl(iso2, Math.max(width * 2, 40))}
      alt=""
      width={width}
      height={height}
      style={{ borderRadius: 3, objectFit: "cover", ...style }}
      onError={() => setFailed(true)}
    />
  );
}
