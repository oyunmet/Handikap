import type { CSSProperties } from "react";

type Props = {
  quality: "high" | "balanced" | "low";
  motionReduced: boolean;
  enabled: boolean;
  travel: number;
};

export default function WorldAtmosphere({ quality, motionReduced, enabled, travel }: Props) {
  const count = quality === "high" ? 18 : quality === "balanced" ? 11 : 5;
  return (
    <div
      className="world-atmosphere"
      data-air={enabled}
      data-quality={quality}
      data-reduced={motionReduced}
      style={{ "--air-parallax": `${-travel * .018}px` } as CSSProperties}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <i
          className={`world-atmosphere__mote${index % 4 === 0 ? " is-warm" : ""}`}
          key={index}
          style={{
            "--mote-x": `${(index * 73 + 13) % 100}%`,
            "--mote-y": `${(index * 47 + 19) % 88}%`,
            "--mote-size": `${index % 5 === 0 ? 3 : 2}px`,
            "--mote-duration": `${11 + (index % 7) * 2}s`,
            "--mote-delay": `${-((index * 7) % 19)}s`,
            "--mote-drift": `${((index % 5) - 2) * 24}px`,
            "--mote-lift": `${36 + (index % 4) * 17}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
