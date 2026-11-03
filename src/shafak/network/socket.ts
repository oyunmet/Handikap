import { io } from "socket.io-client";

export function createWorldSocket() {
  return io({
    autoConnect: false,
    path: "/socket.io",
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 10_000,
  });
}
