export type ClerkKeyHealth = {
  secretKeyConfigured: boolean;
  secretKeyValid: boolean;
  publishableKeyConfigured: boolean;
  publishableKeyValid: boolean;
  clientPublishableKeyConfigured: boolean;
  clientPublishableKeyValid: boolean;
  publishableKeysMatch: boolean;
  secretKeyMatchesPublishableKey: boolean;
};

type PublishableKeyIdentity = {
  mode: "test" | "live";
  frontendApi: string;
};

type ClerkEnvironment = {
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  VITE_CLERK_PUBLISHABLE_KEY?: string;
};

type FetchLike = typeof fetch;

function parsePublishableKey(value: string | undefined): PublishableKeyIdentity | null {
  const match = value?.trim().match(/^pk_(test|live)_([A-Za-z0-9+/_=-]+)$/);
  if (!match) return null;

  try {
    const decoded = Buffer.from(match[2], "base64").toString("utf8");
    if (!decoded.endsWith("$")) return null;
    const frontendApi = decoded.slice(0, -1).toLowerCase();
    const parsed = new URL(`https://${frontendApi}`);
    if (
      !frontendApi ||
      parsed.hostname !== frontendApi ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return {
      mode: match[1] as PublishableKeyIdentity["mode"],
      frontendApi,
    };
  } catch {
    return null;
  }
}

function secretKeyMode(value: string | undefined): "test" | "live" | null {
  if (value?.startsWith("sk_test_")) return "test";
  if (value?.startsWith("sk_live_")) return "live";
  return null;
}

async function clerkRequest(
  path: string,
  secretKey: string,
  fetcher: FetchLike,
): Promise<Response | null> {
  try {
    return await fetcher(`https://api.clerk.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(4_000),
    });
  } catch {
    return null;
  }
}

function domainHost(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function checkClerkKeyHealth(
  environment: ClerkEnvironment = process.env,
  fetcher: FetchLike = fetch,
): Promise<ClerkKeyHealth> {
  const secretKey = environment.CLERK_SECRET_KEY?.trim() ?? "";
  const serverKey = parsePublishableKey(environment.CLERK_PUBLISHABLE_KEY);
  const clientKey = parsePublishableKey(environment.VITE_CLERK_PUBLISHABLE_KEY);
  const secretMode = secretKeyMode(secretKey);
  const secretKeyConfigured = Boolean(secretKey);

  let secretKeyValid = false;
  let secretKeyMatchesPublishableKey = false;
  if (secretKeyConfigured) {
    const usersRequest = clerkRequest(`users?limit=1`, secretKey, fetcher);
    const domainsRequest = serverKey
      ? clerkRequest("domains?limit=100", secretKey, fetcher)
      : Promise.resolve(null);
    const [usersResponse, domainsResponse] = await Promise.all([
      usersRequest,
      domainsRequest,
    ]);
    secretKeyValid = usersResponse?.ok ?? false;

    if (secretKeyValid && domainsResponse?.ok && serverKey) {
      try {
        const body = await domainsResponse.json() as {
          data?: Array<{ frontend_api_url?: unknown; frontendApiUrl?: unknown }>;
        };
        secretKeyMatchesPublishableKey =
          secretMode === serverKey.mode &&
          Array.isArray(body.data) &&
          body.data.some((domain) =>
            domainHost(domain.frontend_api_url ?? domain.frontendApiUrl) ===
            serverKey.frontendApi
          );
      } catch {
        secretKeyMatchesPublishableKey = false;
      }
    }
  }

  const publishableKeysMatch = Boolean(
    serverKey &&
    clientKey &&
    serverKey.mode === clientKey.mode &&
    serverKey.frontendApi === clientKey.frontendApi,
  );

  return {
    secretKeyConfigured,
    secretKeyValid,
    publishableKeyConfigured: Boolean(environment.CLERK_PUBLISHABLE_KEY?.trim()),
    publishableKeyValid: Boolean(serverKey),
    clientPublishableKeyConfigured: Boolean(
      environment.VITE_CLERK_PUBLISHABLE_KEY?.trim(),
    ),
    clientPublishableKeyValid: Boolean(clientKey),
    publishableKeysMatch,
    secretKeyMatchesPublishableKey,
  };
}
