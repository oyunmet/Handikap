import assert from "node:assert/strict";
import test from "node:test";
import { createWorldSocket } from "./socket.ts";

test("world sockets stay manually connected and retry transient disconnects", () => {
  const socket = createWorldSocket();
  try {
    assert.equal(socket.connected, false);
    assert.equal(socket.io.opts.reconnection, true);
    assert.equal(socket.io.opts.reconnectionAttempts, Infinity);
    assert.equal(socket.io.opts.reconnectionDelay, 500);
    assert.equal(socket.io.opts.reconnectionDelayMax, 5_000);
    assert.equal(socket.io.opts.timeout, 10_000);
  } finally {
    socket.close();
  }
});
