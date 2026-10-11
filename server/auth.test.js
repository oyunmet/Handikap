import assert from "node:assert/strict";
import test from "node:test";
import { authFailureReason } from "./auth.ts";

test("Clerk verification reasons are reduced to safe diagnostic codes", () => {
  assert.equal(
    authFailureReason({ reason: "token-invalid-signature" }, "Bearer jwt"),
    "token_invalid_signature",
  );
  assert.equal(
    authFailureReason({ reason: "token-invalid-authorized-parties" }, "Bearer jwt"),
    "authorized_party_mismatch",
  );
  assert.equal(
    authFailureReason({ reason: "invalid-secret-key" }, "Bearer jwt"),
    "secret_key_invalid",
  );
});

test("missing bearer tokens are reported without exposing request data", () => {
  assert.equal(authFailureReason(undefined, undefined), "header_missing");
  assert.equal(authFailureReason(undefined, "Basic ignored"), "header_missing");
});

test("JWT timestamps can identify expiry and future issue time for diagnostics", () => {
  const encodePayload = (claims) =>
    Buffer.from(JSON.stringify(claims)).toString("base64url");
  const token = (claims) => `header.${encodePayload(claims)}.signature`;
  assert.equal(
    authFailureReason(undefined, `Bearer ${token({ exp: 1 })}`),
    "token_expired",
  );
  assert.equal(
    authFailureReason(undefined, `Bearer ${token({ iat: Math.floor(Date.now() / 1000) + 120 })}`),
    "token_iat_in_the_future",
  );
  assert.equal(authFailureReason(undefined, "Bearer not-a-jwt"), "token_malformed");
});
