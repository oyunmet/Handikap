import { useMemo, type CSSProperties } from "react";

type EmberLayerProps = {
  quality: "high" | "balanced" | "low";
  motionReduced: boolean;
};

type EmberStyle = CSSProperties & {
  "--ember-x": string;
  "--ember-y": string;
  "--ember-size": string;
  "--ember-color": string;
  "--ember-duration": string;
  "--ember-delay": string;
  "--ember-drift": string;
  "--ember-opacity": string;
};

const random = (minimum: number, maximum: number) =>
  minimum + Math.random() * (maximum - minimum);

export default function EmberLayer({ quality, motionReduced }: EmberLayerProps) {
  const particles = useMemo(() => {
    if (motionReduced) return [];

    const count = quality === "high" ? 34 : quality === "balanced" ? 14 : 5;
    const colors = ["var(--gold-300)", "var(--ember-400)", "var(--ember-500)"];
    return Array.from({ length: count }, (_, index) => {
      const style: EmberStyle = {
        "--ember-x": `${random(0, 100)}%`,
        "--ember-y": `${random(72, 122)}%`,
        "--ember-size": `${random(1, quality === "high" ? 4.4 : quality === "balanced" ? 3 : 2)}px`,
        "--ember-color": colors[index % colors.length],
        "--ember-duration": `${random(6, 13)}s`,
        "--ember-delay": `${random(-12, 0)}s`,
        "--ember-drift": `${random(-7, 7)}vw`,
        "--ember-opacity": `${random(0.34, 0.78)}`,
      };
      return { index, style };
    });
  }, [motionReduced, quality]);

  return (
    <div className="ember-layer" aria-hidden="true">
      {particles.map((particle) => (
        <span
          className="ember-layer__particle"
          key={particle.index}
          style={particle.style}
        />
      ))}
    </div>
  );
}
