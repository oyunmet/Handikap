import { useState } from "react";
import {
  buildWarRoomPerformanceReport,
  warRoomPerformanceCollector,
  type WarRoomPerformanceReport,
} from "./war-room-performance";

export default function WarRoomPerformanceDiagnostics() {
  const [report, setReport] = useState<WarRoomPerformanceReport | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  const generateReport = () => {
    setReport(buildWarRoomPerformanceReport(warRoomPerformanceCollector));
    setCopyStatus("");
  };

  const copyReport = async () => {
    if (!report) return;
    const serialized = JSON.stringify(report, null, 2);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(serialized);
        setCopyStatus("Rapor panoya kopyalandı. Sunucuya gönderilmedi.");
        return;
      }
    } catch {
      // Fall through to the local selection/copy path for browsers without clipboard permission.
    }

    const textarea = document.createElement("textarea");
    textarea.value = serialized;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    setCopyStatus(copied
      ? "Rapor panoya kopyalandı. Sunucuya gönderilmedi."
      : "Kopyalama izni yok; aşağıdaki raporu seçip kopyalayabilirsin.");
  };

  return (
    <details className="war-room-performance-diagnostics">
      <summary>Tanılama</summary>
      <p>
        Performans raporu yalnızca bu cihazda hazırlanır; hesap verisi içermez ve sunucuya gönderilmez.
      </p>
      <div className="war-room-performance-diagnostics__actions">
        <button type="button" onClick={generateReport}>Performans raporu</button>
        {report && (
          <button type="button" onClick={() => void copyReport()}>Panoya kopyala</button>
        )}
      </div>
      {report?.sampleCount === 0 && (
        <small role="status">
          Henüz kare örneği yok. Maçta birkaç saniye kaldıktan sonra raporu yeniden oluştur.
        </small>
      )}
      {copyStatus && <small role="status">{copyStatus}</small>}
      {report && (
        <pre aria-label="Performans raporu">{JSON.stringify(report, null, 2)}</pre>
      )}
    </details>
  );
}
