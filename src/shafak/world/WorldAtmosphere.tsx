import type { CSSProperties } from "react";
import type { WeatherMode } from "./world-biomes";

type Props = {
  quality: "high" | "balanced" | "low";
  motionReduced: boolean;
  weather: WeatherMode;
  travel: number;
};

export default function WorldAtmosphere({ quality, motionReduced, weather, travel }: Props) {
  const count = quality === "high" ? 24 : quality === "balanced" ? 15 : 5;
  const ambientMoteCount = weather === "fog" ? Math.ceil(count / 3) : 0;
  return (
    <div
      className="world-atmosphere"
      data-weather={weather}
      data-quality={quality}
      data-reduced={motionReduced}
      style={{
        "--air-parallax": `${-travel * .018}px`,
        "--world-wind-duration": weather === "clear" ? "24s" : weather === "fog" ? "32s" : "10s",
      } as CSSProperties}
      aria-hidden="true"
    >
      {Array.from({ length: ambientMoteCount }, (_, index) => (
        <i
          className={`world-atmosphere__mote${index % 4 === 0 ? " is-warm" : ""}`}
          key={index}
          style={{
            "--mote-x": `${(index * 73 + 13) % 100}%`,
            "--mote-y": `${(index * 47 + 19) % 88}%`,
            "--mote-size": `${index % 5 === 0 ? 3 : 2}px`,
            "--mote-duration": `${16 + (index % 7) * 2.3}s`,
            "--mote-delay": `${-((index * 7) % 19)}s`,
            "--mote-drift": `${((index % 5) - 2) * 18}px`,
            "--mote-lift": `${36 + (index % 4) * 17}px`,
          } as CSSProperties}
        />
      ))}
      {(weather === "rain" || weather === "storm") && <i className="world-atmosphere__rain" />}
      {weather === "storm" && <i className="world-atmosphere__lightning" />}
    </div>
  );
}
