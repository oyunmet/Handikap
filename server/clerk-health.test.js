import assert from "node:assert/strict";
import test from "node:test";
import { checkClerkKeyHealth } from "./clerk-health.ts";

function publishableKey(mode, frontendApi) {
  return `pk_${mode}_${Buffer.from(`${frontendApi}$`).toString("base64")}`;
}

test("Clerk health validates key format, Backend API access, and instance alignment", async () => {
  const frontendApi = "example.clerk.accounts.dev";
  const key = publishableKey("test", frontendApi);
  const requests = [];
  const result = await checkClerkKeyHealth({
    CLERK_SECRET_KEY: "sk_test_never-logged",
    CLERK_PUBLISHABLE_KEY: key,
    VITE_CLERK_PUBLISHABLE_KEY: key,
  }, async (url) => {
    requests.push(new URL(url).pathname);
    return url.includes("/users?")
      ? new Response(JSON.stringify({ data: [] }), { status: 200 })
      : new Response(JSON.stringify({
          data: [{ frontend_api_url: `https://${frontendApi}` }],
        }), { status: 200 });
  });

  assert.equal(result.secretKeyValid, true);
  assert.equal(result.publishableKeyValid, true);
  assert.equal(result.clientPublishableKeyValid, true);
  assert.equal(result.publishableKeysMatch, true);
  assert.equal(result.secretKeyMatchesPublishableKey, true);
  assert.deepEqual(requests.sort(), ["/v1/domains", "/v1/users"]);
});

test("Clerk health detects publishable-key mismatches without exposing key values", async () => {
  const result = await checkClerkKeyHealth({
    CLERK_SECRET_KEY: "sk_test_not-logged",
    CLERK_PUBLISHABLE_KEY: publishableKey("test", "first.clerk.accounts.dev"),
    VITE_CLERK_PUBLISHABLE_KEY: publishableKey("test", "second.clerk.accounts.dev"),
  }, async (url) => url.includes("/users?")
    ? new Response("{}", { status: 200 })
    : new Response(JSON.stringify({ data: [] }), { status: 200 }));

  assert.equal(result.secretKeyValid, true);
  assert.equal(result.publishableKeysMatch, false);
  assert.equal(result.secretKeyMatchesPublishableKey, false);
});

test("missing Clerk keys fail closed without making an external request", async () => {
  let requests = 0;
  const result = await checkClerkKeyHealth({}, async () => {
    requests += 1;
    return new Response("{}");
  });

  assert.equal(requests, 0);
  assert.equal(result.secretKeyConfigured, false);
  assert.equal(result.secretKeyValid, false);
  assert.equal(result.publishableKeyValid, false);
  assert.equal(result.publishableKeysMatch, false);
});
