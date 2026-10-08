import { io } from "socket.io-client";

export function createWorldSocket() {
  return io({
    autoConnect: false,
    path: "/socket.io",
  });
}
