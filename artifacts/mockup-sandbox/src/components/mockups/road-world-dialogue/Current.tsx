import "./_group.css";

export function Current() {
  return (
    <main className="dialogue-preview">
      <div className="dialogue-preview__road" aria-hidden="true" />
      <span className="dialogue-preview__caption">Yol karşılaşması · eski kart</span>
      <section className="world-npc-dialogue" role="group" aria-label="Mor Hançer ile karşılaşma">
        <span>Mor Hançer konuşuyor</span>
        <p>“Yeminim demiri bile senden önce eğdirir.”</p>
        <button className="world-npc-dialogue__fight" type="button" disabled>
          <span aria-hidden="true">⚔</span> GÜNLÜK HAK DOLDU
        </button>
      </section>
    </main>
  );
}
