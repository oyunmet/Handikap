export function getDuelSettlementErrorMessage(code: string, status?: number) {
  if (status === 429) return "Düello sonucu çok sık gönderildi. Biraz bekleyip tekrar doğrula.";

  const messages: Record<string, string> = {
    authentication_required: "Düello doğrulanamadı; oturumun sona ermiş olabilir. Yeniden giriş yapıp tekrar dene.",
    authentication_unavailable: "Düello sunucusu şu anda oturumu doğrulayamıyor. Biraz sonra tekrar dene.",
    invalid_completion: "Düello sonucu eksik ulaştı. Aynı ekrandaki yeniden doğrulama düğmesini kullan.",
    invalid_input_log: "Düello hareket kaydı doğrulanamadı. Ödül kaydedilmedi; yeniden doğrula.",
    duel_not_finished: "Sunucu maçın tamamlandığını henüz doğrulayamadı. Ödül kaydedilmedi; yeniden doğrula.",
    duel_finished_too_quickly: "Düello süresi sunucu kaydında eksik görünüyor. Ödül kaydedilmedi; yeniden doğrula.",
    duel_not_found: "Düello kaydı bulunamadı. Ödül doğrulanamadı; dünyaya dönüp tekrar dene.",
    duel_expired: "Düello doğrulama süresi doldu. Bu maçın ödülü kaydedilemedi.",
    duel_already_completed: "Düello kaydı tamamlanmış. Profilini yenileyip ödül bakiyeni kontrol et.",
    profile_not_ready: "Hesap profili hazır değil. Biraz sonra aynı düelloyu tekrar doğrula.",
    duel_storage_unavailable: "Düello sonucu sunucuya kaydedilemedi. Ödül verilmedi; daha sonra tekrar doğrula.",
  };

  return messages[code]
    ?? "Düello sonucu doğrulanamadı. Ödül kaydedilmedi; tekrar doğrula.";
}
