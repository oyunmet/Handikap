import assert from "node:assert/strict";
import test from "node:test";
import { ApiResponseError, requestJson, requestJsonWithRetry } from "./api-json.ts";

const options = {
  operation: "store test",
  fallbackMessage: "Mağaza şu an yüklenemedi, tekrar dene.",
};

async function withFetch(mockFetch, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("HTML responses produce a friendly retryable error without parsing the body as JSON", async () => {
  await withFetch(async () => new Response("<html>not found</html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  }), async () => {
    await assert.rejects(
      requestJson("/api/store/catalog", {}, options),
      (error) => error instanceof ApiResponseError
        && error.message === options.fallbackMessage
        && error.retryable,
    );
  });
});

test("empty JSON responses produce a friendly error", async () => {
  await withFetch(async () => new Response(null, {
    status: 204,
    headers: { "content-type": "application/json" },
  }), async () => {
    await assert.rejects(
      requestJson("/api/store/purchase", {}, options),
      (error) => error instanceof ApiResponseError && error.message === options.fallbackMessage,
    );
  });
});

test("known JSON API errors are mapped to user-facing text", async () => {
  await withFetch(async () => new Response(JSON.stringify({ error: "insufficient_funds" }), {
    status: 409,
    headers: { "content-type": "application/json; charset=utf-8" },
  }), async () => {
    await assert.rejects(
      requestJson("/api/store/purchase", {}, {
        ...options,
        messageForCode: (code) => code === "insufficient_funds" ? "Bakiye yetersiz." : options.fallbackMessage,
      }),
      (error) => error instanceof ApiResponseError && error.message === "Bakiye yetersiz.",
    );
  });
});

test("valid JSON responses are returned", async () => {
  await withFetch(async () => new Response(JSON.stringify({ items: [1, 2] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }), async () => {
    assert.deepEqual(await requestJson("/api/store/catalog", {}, options), { items: [1, 2] });
  });
});

test("transient server errors are retried with a bounded attempt count", async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return calls < 3
      ? new Response(JSON.stringify({ error: "pickup_storage_unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        })
      : new Response(JSON.stringify({ claimedPickupIds: ["pickup-1"] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
  }, async () => {
    const result = await requestJsonWithRetry("/api/profile/pickups", {
      method: "POST",
      body: JSON.stringify({ pickupIds: ["pickup-1"] }),
    }, options, { maxRetries: 2, baseDelayMs: 0 });
    assert.deepEqual(result, { claimedPickupIds: ["pickup-1"] });
  });
  assert.equal(calls, 3);
});

test("authentication and validation errors are not retried", async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: "authentication_required" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }, async () => {
    await assert.rejects(
      requestJsonWithRetry("/api/profile/pickups", { method: "POST" }, options, {
        maxRetries: 2,
        baseDelayMs: 0,
      }),
      (error) => error instanceof ApiResponseError && error.status === 401 && !error.retryable,
    );
  });
  assert.equal(calls, 1);
});
