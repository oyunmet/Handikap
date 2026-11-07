const origin = (process.env.ANDROID_PWA_ORIGIN ?? "https://handikap.vercel.app")
  .replace(/\/+$/, "");
const errors = [];

async function fetchAsset(path) {
  const response = await fetch(new URL(path, `${origin}/`));
  if (!response.ok) {
    throw new Error(`${path} responded with HTTP ${response.status}`);
  }
  return response;
}

try {
  const manifestResponse = await fetchAsset("/manifest.webmanifest");
  const manifest = await manifestResponse.json();
  if (manifest.name !== "Şafak Savaşçıları") errors.push("Manifest app name is incorrect.");
  if (manifest.start_url !== "/" || manifest.scope !== "/") {
    errors.push("Manifest start_url and scope must both be /.");
  }
  if (manifest.display !== "standalone") errors.push("Manifest display must be standalone.");
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    errors.push("Manifest does not declare app icons.");
  }

  for (const icon of manifest.icons ?? []) {
    const response = await fetchAsset(icon.src);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const isPng = bytes.length >= 24
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47;
    const width = isPng ? new DataView(bytes.buffer, bytes.byteOffset).getUint32(16) : 0;
    const height = isPng ? new DataView(bytes.buffer, bytes.byteOffset).getUint32(20) : 0;
    if (!isPng || `${width}x${height}` !== icon.sizes) {
      errors.push(`${icon.src} does not match its declared PNG size ${icon.sizes}.`);
    }
  }

  await fetchAsset("/sw.js");
  await fetchAsset("/offline.html");
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

if (errors.length) {
  console.error(`Android web preflight failed for ${origin}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Android web preflight passed for ${origin}.`);
}
