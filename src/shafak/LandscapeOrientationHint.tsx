export default function LandscapeOrientationHint({ warRoom = false }: { warRoom?: boolean }) {
  return (
    <div className="landscape-orientation-hint" role="status" aria-live="polite">
      <span className="landscape-orientation-hint__icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none">
          <rect x="15" y="22" width="34" height="20" rx="3" />
          <path d="M27 26h10M27 38h10M31 13a20 20 0 0 1 17 9" />
          <path d="m45 16 4 6-7 1" />
          <path d="M33 51a20 20 0 0 1-17-9" />
          <path d="m19 48-3-6 7-1" />
        </svg>
      </span>
      <strong>{warRoom ? "DİKEY YA DA YATAY DEVAM ET" : "EKRAN YÖNÜNÜ İSTEDİĞİN GİBİ DEĞİŞTİR"}</strong>
      <span>Oyun, ekran döndürüldüğünde de açık kalır.</span>
    </div>
  );
}
