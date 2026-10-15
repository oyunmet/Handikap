import { useId } from "react";

export default function MetEmblem({ size }: { size: number }) {
  const gradientId = `met-gold-${useId().replaceAll(":", "")}`;
  const glowId = `met-glow-${useId().replaceAll(":", "")}`;

  return (
    <svg
      className="met-emblem"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="9" y1="5" x2="55" y2="59" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4d998" />
          <stop offset=".5" stopColor="#b47c3d" />
          <stop offset="1" stopColor="#6b4526" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientTransform="translate(32 28) rotate(90) scale(24 24)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9a75a" stopOpacity=".3" />
          <stop offset="1" stopColor="#422714" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M32 3 56 11v20c0 14-10 23-24 30C18 54 8 45 8 31V11L32 3Z"
        fill="#26190f"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
      />
      <path
        d="M32 8 51 14.5v16.8c0 10.8-7.7 18.9-19 25.1-11.3-6.2-19-14.3-19-25.1V14.5L32 8Z"
        fill="#2b1c12"
        stroke="#947043"
        strokeWidth="1"
      />
      <path
        d="M32 9 50 15v15.8c0 10-7.2 17.5-18 23.7-10.8-6.2-18-13.7-18-23.7V15l18-6Z"
        fill={`url(#${glowId})`}
      />
      <text
        x="32"
        y="43"
        textAnchor="middle"
        fill="#f3dfb7"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="30"
        fontWeight="600"
      >
        M
      </text>
    </svg>
  );
}
