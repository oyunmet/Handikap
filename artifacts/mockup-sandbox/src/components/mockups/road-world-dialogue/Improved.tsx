import "./_group.css";

export function Improved() {
  return (
    <main className="dialogue-preview dialogue-preview--updated">
      <div className="dialogue-preview__road" aria-hidden="true" />
      <span className="dialogue-preview__caption">Yol karşılaşması · düzenlenmiş kart</span>
      <section className="world-npc-dialogue" role="group" aria-label="Mor Hançer ile karşılaşma">
        <span>Mor Hançer konuşuyor</span>
        <p>“Yeminim demiri bile senden önce eğdirir.”</p>
        <span className="world-npc-dialogue__status" role="status">Günlük düello hakkı doldu</span>
      </section>
    </main>
  );
}
