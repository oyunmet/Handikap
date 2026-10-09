import { readFile, writeFile } from "node:fs/promises";

const lockPath = new URL("../package-lock.json", import.meta.url);
const lockText = await readFile(lockPath, "utf8");
const lock = JSON.parse(lockText);

if (!lock.packages || typeof lock.packages !== "object") {
  throw new Error("package-lock.json does not contain a packages map.");
}

let changed = 0;
for (const [name, entry] of Object.entries(lock.packages)) {
  if (typeof entry.resolved !== "string") continue;
  const url = new URL(entry.resolved);
  if (!url.hostname.endsWith(".replit.internal")) continue;
  if (url.hostname !== "package-firewall.replit.internal" || !url.pathname.startsWith("/npm/")) {
    throw new Error(`Unsupported private npm URL in lockfile entry: ${name}`);
  }
  entry.resolved = `https://registry.npmjs.org/${url.pathname.slice("/npm/".length)}${url.search}${url.hash}`;
  changed += 1;
}

if (process.argv.includes("--check")) {
  console.log(`${changed} private npm tarball URL(s) would be normalized; lockfile left unchanged.`);
} else if (changed > 0) {
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`Normalized ${changed} private npm tarball URL(s) for external CI.`);
} else {
  console.log("No private npm tarball URLs found.");
}
