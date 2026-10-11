import assert from "node:assert/strict";
import test from "node:test";
import { getClerkProxyUrl } from "./clerk-proxy.ts";

test("an unset or blank Clerk proxy stays disabled", () => {
  assert.equal(getClerkProxyUrl(undefined), undefined);
  assert.equal(getClerkProxyUrl(""), undefined);
  assert.equal(getClerkProxyUrl("  \n "), undefined);
});

test("valid same-origin paths and absolute HTTP(S) URLs are accepted", () => {
  assert.equal(getClerkProxyUrl("/clerk-proxy"), "/clerk-proxy");
  assert.equal(getClerkProxyUrl("https://auth.example.com/proxy"), "https://auth.example.com/proxy");
  assert.equal(getClerkProxyUrl("http://localhost:3000/proxy"), "http://localhost:3000/proxy");
});

test("malformed and unsafe Clerk proxy values are ignored", () => {
  assert.equal(getClerkProxyUrl("not a URL"), undefined);
  assert.equal(getClerkProxyUrl("javascript:alert(1)"), undefined);
  assert.equal(getClerkProxyUrl("//auth.example.com/proxy"), undefined);
  assert.equal(getClerkProxyUrl("https://user:pass@auth.example.com/proxy"), undefined);
});
