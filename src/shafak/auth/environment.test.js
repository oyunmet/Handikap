import assert from "node:assert/strict";
import test from "node:test";
import { getAuthExperience } from "./environment.ts";

test("Vercel preview without Clerk opens the offline guest game", () => {
  assert.equal(
    getAuthExperience({
      hasClerkKey: false,
      isDevelopment: false,
      vercelEnvironment: "preview",
    }),
    "guest",
  );
});

test("local development without Clerk opens the offline guest game", () => {
  assert.equal(
    getAuthExperience({
      hasClerkKey: false,
      isDevelopment: true,
      vercelEnvironment: "",
    }),
    "guest",
  );
});

test("production without Clerk remains blocked from account-backed gameplay", () => {
  assert.equal(
    getAuthExperience({
      hasClerkKey: false,
      isDevelopment: false,
      vercelEnvironment: "production",
    }),
    "setup",
  );
});

test("configured Clerk takes precedence in every environment", () => {
  assert.equal(
    getAuthExperience({
      hasClerkKey: true,
      isDevelopment: false,
      vercelEnvironment: "preview",
    }),
    "clerk",
  );
});
