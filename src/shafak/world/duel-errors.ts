export function getDuelSettlementErrorMessage(code: string, status?: number) {
  if (status === 429) return "Düello sonucu çok sık gönderildi. Biraz bekleyip tekrar doğrula.";

  const messages: Record<string, string> = {
    authentication_required: "Düello doğrulanamadı; oturumun sona ermiş olabilir. Yeniden giriş yapıp tekrar dene.",
    authentication_unavailable: "Düello sunucusu şu anda oturumu doğrulayamıyor. Biraz sonra tekrar dene.",
    network_error: "Bağlantı kesildi. Aynı maç için yeniden doğrulamayı kullan; yeni maç başlatma.",
    invalid_content_type: "Düello sunucusundan geçerli yanıt alınamadı. Biraz sonra aynı maçı yeniden doğrula.",
    unreadable_body: "Düello yanıtı okunamadı. Ödül doğrulanmadı; aynı maçı yeniden doğrula.",
    empty_body: "Düello sunucusu boş yanıt verdi. Ödül doğrulanmadı; aynı maçı yeniden doğrula.",
    invalid_json: "Düello sunucusunun yanıtı okunamadı. Ödül doğrulanmadı; aynı maçı yeniden doğrula.",
    invalid_completion: "Düello sonucu eksik ulaştı. Aynı ekrandaki yeniden doğrulama düğmesini kullan.",
    invalid_input_log: "Düello hareket kaydı doğrulanamadı. Ödül kaydedilmedi; yeniden doğrula.",
    duel_not_finished: "Sunucu maçın tamamlandığını henüz doğrulayamadı. Ödül kaydedilmedi; yeniden doğrula.",
    duel_finished_too_quickly: "Düello süresi sunucu kaydında eksik görünüyor. Ödül kaydedilmedi; yeniden doğrula.",
    duel_not_found: "Düello kaydı bulunamadı. Ödül doğrulanamadı; dünyaya dönüp tekrar dene.",
    duel_expired: "Düello doğrulama süresi doldu. Bu maçın ödülü kaydedilemedi.",
    duel_already_completed: "Düello kaydı tamamlanmış. Profilini yenileyip ödül bakiyeni kontrol et.",
    database_unavailable: "Oyun veritabanına şu an ulaşılamıyor. Ödül kaydedilmedi; aynı düelloyu daha sonra yeniden doğrula.",
    profile_not_ready: "Hesap profili hazır değil. Biraz sonra aynı düelloyu tekrar doğrula.",
    duel_storage_unavailable: "Düello sonucu sunucuya kaydedilemedi. Ödül verilmedi; daha sonra tekrar doğrula.",
    invalid_duel_clock: "Düello süresi sunucu kaydıyla uyuşmuyor. Ödül doğrulanmadı; aynı maçı yeniden doğrula.",
    duel_opponent_invalid: "Rakip doğrulaması tamamlanamadı. Ödül verilmedi; aynı düelloyu yeniden doğrula.",
    internal_server_error: "Düello sunucusunda geçici bir sorun var. Ödül kaydedilmedi; biraz sonra yeniden doğrula.",
  };

  return messages[code]
    ?? (status === 0
      ? "Sunucu bağlantısı kurulamadı. Aynı maçı yeniden doğrula; yeni maç başlatma."
      : status !== undefined && status >= 500
        ? "Düello sunucusunda geçici bir sorun var. Ödül kaydedilmedi; biraz sonra yeniden doğrula."
        : "Düello sonucu doğrulanamadı. Ödül kaydedilmedi; tekrar doğrula.");
}
