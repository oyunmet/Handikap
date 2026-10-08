import { spawn } from "node:child_process";

const commands = ["dev:server", "dev:client"];
const children = commands.map((script) =>
  spawn("npm", ["run", script], {
    env: process.env,
    stdio: "inherit",
  }),
);

let isStopping = false;
let exitCode = 0;

function stopChildren(signal, code) {
  if (isStopping) return;

  isStopping = true;
  exitCode = code;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

for (const child of children) {
  child.once("error", () => {
    stopChildren("SIGTERM", 1);
  });

  child.once("close", (code) => {
    if (!isStopping) {
      stopChildren("SIGTERM", code ?? 1);
    }

    if (children.every((process) => process.exitCode !== null || process.signalCode !== null)) {
      process.exitCode = exitCode;
    }
  });
}

process.once("SIGINT", () => stopChildren("SIGINT", 0));
process.once("SIGTERM", () => stopChildren("SIGTERM", 0));
