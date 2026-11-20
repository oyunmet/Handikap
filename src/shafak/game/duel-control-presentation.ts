export type DuelAttackPresentationInput = {
  weaponName: string;
  isBowActive: boolean;
  bowCloseRange: boolean;
  ammoCount: number | null;
};

export function getDuelAttackPresentation({
  weaponName,
  isBowActive,
  bowCloseRange,
  ammoCount,
}: DuelAttackPresentationInput) {
  const isDagger = (isBowActive && bowCloseRange) || /bıçak|hançer|dagger/i.test(weaponName);
  const ammoEmpty = isBowActive && !bowCloseRange && ammoCount !== null && ammoCount <= 0;
  const label = isBowActive
    ? bowCloseRange ? "BIÇAK" : ammoEmpty ? "OK YOK" : "ATEŞ"
    : isDagger ? "BIÇAK" : "SALDIRI";
  const description = isBowActive
    ? bowCloseRange
      ? "Av bıçağıyla yakın menzil saldırısı"
      : ammoEmpty
        ? "Ok yok. Savaş çantana ok ekle veya diğer silaha geç."
        : "Nişan kilitliyken ok kullanarak ateş et"
    : `${isDagger ? "Bıçakla saldır" : "Seçili silahla saldır"}: ${weaponName}`;

  return { isDagger, ammoEmpty, label, description };
}
