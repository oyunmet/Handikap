import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiResponseError,
  requestAuthenticatedJson,
  requestAuthenticatedJsonWithRetry,
  requestJson,
  requestJsonWithRetry,
} from "./api-json.ts";

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

test("rate-limit responses are not retried when explicitly disabled", async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }, async () => {
    await assert.rejects(
      requestJsonWithRetry("/api/duels/start", { method: "POST" }, options, {
        maxRetries: 1,
        baseDelayMs: 0,
        retryOn429: false,
      }),
      (error) => error instanceof ApiResponseError && error.status === 429,
    );
  });
  assert.equal(calls, 1);
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

test("authenticated requests fetch a fresh token and send it as a bearer header", async () => {
  let tokenCalls = 0;
  let requestHeaders;
  await withFetch(async (_input, init) => {
    tokenCalls += 1;
    requestHeaders = new Headers(init.headers);
    return new Response(JSON.stringify({ profile: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }, async () => {
    const result = await requestAuthenticatedJson(
      "/api/profile",
      { credentials: "include" },
      options,
      async () => "fresh-session-jwt",
    );
    assert.deepEqual(result, { profile: {} });
  });
  assert.equal(tokenCalls, 1);
  assert.equal(requestHeaders.get("authorization"), "Bearer fresh-session-jwt");
});

test("a 401 forces one token refresh and retries only once", async () => {
  const tokenOptions = [];
  let requestCalls = 0;
  await withFetch(async () => {
    requestCalls += 1;
    return requestCalls === 1
      ? new Response(JSON.stringify({ error: "authentication_required" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      : new Response(JSON.stringify({ profile: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
  }, async () => {
    const result = await requestAuthenticatedJson(
      "/api/profile",
      {},
      options,
      async (tokenOptionsArg) => {
        tokenOptions.push(tokenOptionsArg);
        return tokenOptions.length === 1 ? "cached-token" : "refreshed-token";
      },
    );
    assert.deepEqual(result, { profile: {} });
  });
  assert.equal(requestCalls, 2);
  assert.deepEqual(tokenOptions, [undefined, { skipCache: true }]);
});

test("missing tokens prevent the API call and signal the caller to sign in", async () => {
  let requestCalls = 0;
  let unauthorizedCalls = 0;
  await withFetch(async () => {
    requestCalls += 1;
    return new Response("{}");
  }, async () => {
    await assert.rejects(
      requestAuthenticatedJson(
        "/api/profile",
        {},
        options,
        async () => null,
        () => { unauthorizedCalls += 1; },
      ),
      (error) => error instanceof ApiResponseError
        && error.status === 401
        && error.code === "session_missing",
    );
  });
  assert.equal(requestCalls, 0);
  assert.equal(unauthorizedCalls, 1);
});

test("pickup retries remain bounded and a 401 still refreshes only once", async () => {
  const tokenOptions = [];
  let requestCalls = 0;
  await withFetch(async () => {
    requestCalls += 1;
    return requestCalls === 1
      ? new Response(JSON.stringify({ error: "authentication_required" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      : new Response(JSON.stringify({ claimedPickupIds: ["pickup-1"] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
  }, async () => {
    const result = await requestAuthenticatedJsonWithRetry(
      "/api/profile/pickups",
      { method: "POST" },
      options,
      async (tokenOptionsArg) => {
        tokenOptions.push(tokenOptionsArg);
        return "session-jwt";
      },
      undefined,
      { maxRetries: 2, baseDelayMs: 0 },
    );
    assert.deepEqual(result, { claimedPickupIds: ["pickup-1"] });
  });
  assert.equal(requestCalls, 2);
  assert.deepEqual(tokenOptions, [undefined, { skipCache: true }]);
});
