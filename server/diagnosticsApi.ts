import { Router } from "express";
import rateLimit from "express-rate-limit";

const crashKinds = new Set([
  "window-error",
  "unhandled-rejection",
  "startup-render",
]);

export function createDiagnosticsApi() {
  const router = Router();
  const crashLimit = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post("/api/diagnostics/crash", crashLimit, (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const kind = request.body?.kind;
    if (typeof kind !== "string" || !crashKinds.has(kind)) {
      response.status(400).json({ error: "invalid_diagnostic_kind" });
      return;
    }
    // Never accept or log messages, stack traces, account IDs, URLs or user-agent values.
    console.error("[anonymous-client-crash]", kind);
    response.status(202).json({ accepted: true });
  });

  return router;
}
