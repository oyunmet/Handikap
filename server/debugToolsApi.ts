import express from "express";

export function createDebugToolsApi(enabled = process.env.DEBUG_TOOLS === "1") {
  const router = express.Router();

  router.get("/api/debug-tools/status", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (!enabled) {
      response.status(404).json({ error: "not_found" });
      return;
    }

    response.json({ enabled: true });
  });

  return router;
}
