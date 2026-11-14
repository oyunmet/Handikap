import "./age-gate.css";

type AgeGateProps = {
  blocked: boolean;
  onChoice: (choice: "adult" | "underage") => void;
};

export default function AgeGate({ blocked, onChoice }: AgeGateProps) {
  return (
    <main className="age-gate" role="main">
      <section className="age-gate__card" aria-labelledby="age-gate-title">
        <span className="age-gate__eyebrow">ŞAFAK SAVAŞÇILARI</span>
        <h1 id="age-gate-title">{blocked ? "Oyuna erişilemiyor" : "Yaşını doğrula"}</h1>
        {blocked ? (
          <p>Bu oyun için en az 13 yaşında olmalısın. Kayıt ve kişisel bilgi girişi kapalıdır.</p>
        ) : (
          <>
            <p>Hesap oluşturmadan veya oyuna devam etmeden önce en az 13 yaşında olduğunu doğrula.</p>
            <div className="age-gate__actions">
              <button type="button" onClick={() => onChoice("adult")}>13 yaşındayım veya daha büyüğüm</button>
              <button type="button" onClick={() => onChoice("underage")}>13 yaşından küçüğüm</button>
            </div>
          </>
        )}
        <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/privacy`}>Gizlilik bildirimi</a>
      </section>
    </main>
  );
}
