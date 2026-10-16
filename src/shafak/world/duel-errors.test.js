import assert from "node:assert/strict";
import test from "node:test";
import { getDuelSettlementErrorMessage } from "./duel-errors.ts";

test("duel settlement shows a useful reason for server validation failures", () => {
  assert.match(getDuelSettlementErrorMessage("duel_not_finished"), /maçın tamamlandığını/i);
  assert.match(getDuelSettlementErrorMessage("invalid_input_log"), /hareket kaydı doğrulanamadı/i);
  assert.match(getDuelSettlementErrorMessage("authentication_required"), /yeniden giriş/i);
  assert.match(getDuelSettlementErrorMessage("duel_storage_unavailable"), /sunucuya kaydedilemedi/i);
  assert.match(getDuelSettlementErrorMessage("unknown_code"), /tekrar doğrula/i);
  assert.equal(getDuelSettlementErrorMessage("unknown_code", 429), "Düello sonucu çok sık gönderildi. Biraz bekleyip tekrar doğrula.");
});
