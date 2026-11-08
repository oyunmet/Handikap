import { useEffect, useState } from "react";
import { clearLocalProfileCopies } from "./game/profile";
import "./legal-pages.css";

const SUPPORT_EMAIL = "muhammedeminturk.16@gmail.com";
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const APP_HOME = `${BASE_PATH}/`;
const PRIVACY_PATH = `${BASE_PATH}/privacy`;
const DELETE_ACCOUNT_PATH = `${BASE_PATH}/delete-account`;
const CONFIRMATION_TEXT = "HESABIMI SİL";

function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} · Şafak Savaşçıları`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

function LegalHeader() {
  return (
    <header className="legal-page__header">
      <a className="legal-page__brand" href={APP_HOME}>
        <img src={`${BASE_PATH}/logo.svg`} alt="" />
        <span><strong>ŞAFAK</strong><small>SAVAŞÇILARI</small></span>
      </a>
      <a className="legal-page__home" href={APP_HOME}>Oyuna dön</a>
    </header>
  );
}

function LegalFooter() {
  return (
    <footer className="legal-page__footer">
      <a href={PRIVACY_PATH}>Gizlilik</a>
      <a href={DELETE_ACCOUNT_PATH}>Hesabı sil</a>
      <a href={`mailto:${SUPPORT_EMAIL}`}>Destek: {SUPPORT_EMAIL}</a>
    </footer>
  );
}

export function PrivacyPage() {
  usePageTitle("Gizlilik bildirimi");
  return (
    <main className="legal-page">
      <article className="legal-page__card">
        <LegalHeader />
        <div className="legal-page__content">
          <span className="legal-page__eyebrow">ŞAFAK SAVAŞÇILARI</span>
          <h1>Gizlilik bildirimi</h1>
          <p className="legal-page__updated">Son güncelleme: 9 Kasım 2026</p>
          <p>
            Bu bildirim, Şafak Savaşçıları web ve Android sürümlerinde hangi
            bilgilerin kullanıldığını ve hesabını nasıl silebileceğini açıklar.
          </p>

          <h2>İşlenen bilgiler</h2>
          <ul>
            <li>
              Giriş için Clerk tarafından yönetilen hesap kimliği ve hesap
              bilgileri. Oyunun sunucusu ilerleme kaydını bu kimlikle eşleştirir.
            </li>
            <li>
              Oyun profilindeki görünen ad, bölüm ilerlemesi, seviye, deneyim,
              oyun içi para ve malzemeler, envanter, ekipman, düello sonuçları,
              ödül ve alınan eşya kayıtları.
            </li>
            <li>
              Misafir ilerlemesi ve ses, grafik, hareket ve gökyüzü saati gibi
              tercihler bu cihazın tarayıcı depolamasında tutulabilir.
            </li>
            <li>
              Giriş, barındırma ve veri tabanı sağlayıcıları hizmeti sunmak için
              teknik erişim kayıtları oluşturabilir.
            </li>
          </ul>

          <h2>Kullanım ve saklama</h2>
          <p>
            Bu bilgiler hesabı doğrulamak, oyun ilerlemesini cihazlar arasında
            eşitlemek, düello ve ödülleri kaydetmek ve oyunun güvenli çalışmasını
            sağlamak için kullanılır. Hesap verileri, hesabını silene kadar
            saklanır. Sağlayıcıların yedeklerinde bulunan kayıtlar, kendi yedek
            saklama süreleri boyunca kalabilir.
          </p>
          <p>
            Bu sürüm gerçek parayla oyun içi satın alma sunmaz. Oyun çevrimiçi
            çalışır; internet yokken yalnızca bağlantı bilgilendirme ekranı
            gösterilir ve çevrimdışı oyun ilerlemesi vaat edilmez.
          </p>

          <h2>Hesabını silme</h2>
          <p>
            <a href={DELETE_ACCOUNT_PATH}>Hesap silme sayfasından</a> hesabını ve
            sunucudaki oyun kayıtlarını kalıcı olarak silebilirsin. Silme
            başlatıldığında bu tarayıcıdaki yerel oyun profili de temizlenir.
          </p>

          <h2>İletişim</h2>
          <p>
            Gizlilik veya veri silme konusunda{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> adresinden
            bize ulaşabilirsin.
          </p>
        </div>
        <LegalFooter />
      </article>
    </main>
  );
}

type DeletionState = "idle" | "pending" | "deleted" | "unauthorized" | "error";

export function DeleteAccountPage() {
  usePageTitle("Hesap silme");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [state, setState] = useState<DeletionState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const canDelete = confirmation.trim() === CONFIRMATION_TEXT && acknowledged;

  async function deleteAccount() {
    if (!canDelete || state === "pending") return;
    setState("pending");
    setErrorMessage("");
    try {
      const response = await fetch("/api/profile/account", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: CONFIRMATION_TEXT }),
      });
      const payload = await response.json().catch(() => null) as { error?: unknown } | null;
      if (response.status === 401) {
        setState("unauthorized");
        return;
      }
      if (!response.ok) {
        setState("error");
        if (payload?.error === "data_cleanup_pending") {
          setErrorMessage(
            `Hesap oturumu silindi ancak oyun verilerinin temizliği tamamlanamadı. ${SUPPORT_EMAIL} adresinden destek iste.`,
          );
        } else if (payload?.error === "account_deletion_unavailable") {
          setErrorMessage(
            `Hesap silme hizmeti şu anda kullanılamıyor. Lütfen ${SUPPORT_EMAIL} adresinden destek iste.`,
          );
        } else {
          setErrorMessage(
            `Silme isteği tamamlanamadı. Biraz sonra yeniden dene veya ${SUPPORT_EMAIL} adresinden destek iste.`,
          );
        }
        return;
      }

      clearLocalProfileCopies();
      setState("deleted");
    } catch {
      setState("error");
      setErrorMessage(
        `Sunucuya ulaşılamadı. Bağlantını kontrol edip yeniden dene; sorun sürerse ${SUPPORT_EMAIL} adresinden destek iste.`,
      );
    }
  }

  return (
    <main className="legal-page">
      <article className="legal-page__card legal-page__card--delete">
        <LegalHeader />
        <div className="legal-page__content">
          <span className="legal-page__eyebrow">HESAP VE VERİLER</span>
          <h1>Hesabını sil</h1>
          {state === "deleted" ? (
            <section className="legal-page__result" role="status">
              <strong>Silme isteği tamamlandı.</strong>
              <p>
                Hesap kimliğin ve sunucudaki profil, ilerleme, düello, ödül ve
                oyun içi işlem kayıtların silindi. Bu cihazdaki yerel profil de
                temizlendi.
              </p>
              <a className="legal-page__button" href={APP_HOME}>Ana sayfaya dön</a>
            </section>
          ) : (
            <>
              <p>
                Bu işlem geri alınamaz. Hesap kimliğin ve sunucudaki oyun
                profilin, bölüm ilerlemen, düello kayıtların, ödül/eşya
                kayıtların ve oyun içi işlem kayıtların silinir. Bu tarayıcıdaki
                yerel oyun profili de temizlenir.
              </p>
              <p>
                Hesap silmek için bu tarayıcıda hesabına giriş yapmış olmalısın.
                Bu işlem ilerlemeni kurtarılamaz biçimde kaldırır.
              </p>
              <label className="legal-page__check">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  disabled={state === "pending"}
                  onChange={(event) => setAcknowledged(event.currentTarget.checked)}
                />
                <span>Hesabımın ve oyun verilerimin kalıcı olarak silineceğini anlıyorum.</span>
              </label>
              <label className="legal-page__confirm">
                Onaylamak için <strong>{CONFIRMATION_TEXT}</strong> yaz
                <input
                  autoComplete="off"
                  value={confirmation}
                  disabled={state === "pending"}
                  onChange={(event) => setConfirmation(event.currentTarget.value)}
                />
              </label>
              {state === "unauthorized" && (
                <p className="legal-page__error" role="alert">
                  Önce hesabına giriş yap. Girişten sonra bu sayfaya dönerek işlemi tamamlayabilirsin.{" "}
                  <a href={`${BASE_PATH}/sign-in`}>Giriş yap</a>
                </p>
              )}
              {state === "error" && <p className="legal-page__error" role="alert">{errorMessage}</p>}
              <button
                className="legal-page__button legal-page__button--danger"
                type="button"
                disabled={!canDelete || state === "pending"}
                onClick={() => void deleteAccount()}
              >
                {state === "pending" ? "HESAP SİLİNİYOR…" : "HESABIMI VE İLERLEMEMİ SİL"}
              </button>
              <p className="legal-page__note">
                Hesap silme çalışmazsa <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> adresinden yardım iste.
              </p>
            </>
          )}
        </div>
        <LegalFooter />
      </article>
    </main>
  );
}
