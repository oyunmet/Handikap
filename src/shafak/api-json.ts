export type ApiJsonOptions = {
  operation: string;
  fallbackMessage: string;
  messageForCode?: (code: string, status: number) => string;
  logFailures?: boolean;
};

export type ApiRetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
};

export type ClerkTokenGetter = (
  options?: { skipCache?: boolean },
) => Promise<string | null>;

export type AuthenticatedApiRequest = <T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: ApiJsonOptions,
) => Promise<T>;

export type AuthenticatedApiRequestWithRetry = <T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: ApiJsonOptions,
  retryOptions?: ApiRetryOptions,
) => Promise<T>;

export class ApiResponseError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

function isJsonContentType(contentType: string) {
  return /(?:^|\/|\+)json(?:\s*;|$)/i.test(contentType);
}

function errorCodeFrom(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const code = (value as Record<string, unknown>).error;
  return typeof code === "string" ? code : "";
}

function isRetryableStatus(status: number) {
  return status === 0 || status === 408 || status === 425 || status === 429 ||
    status === 500 || status === 502 || status === 503 || status === 504;
}

function logApiIssue(operation: string, status: number, contentType: string, code: string) {
  console.warn("[api]", {
    operation,
    status,
    contentType: contentType || "(missing)",
    code,
  });
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: ApiJsonOptions,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (options.logFailures !== false) {
      console.warn("[api] network request failed", {
        operation: options.operation,
        name: error instanceof Error ? error.name : "unknown",
      });
    }
    throw new ApiResponseError(options.fallbackMessage, 0, "network_error", true);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!isJsonContentType(contentType)) {
    if (options.logFailures !== false) {
      logApiIssue(options.operation, response.status, contentType, "invalid_content_type");
    }
    throw new ApiResponseError(
      options.fallbackMessage,
      response.status,
      "invalid_content_type",
      isRetryableStatus(response.status) || response.status === 200,
    );
  }

  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    if (options.logFailures !== false) {
      console.warn("[api] response body read failed", {
        operation: options.operation,
        status: response.status,
      });
    }
    throw new ApiResponseError(
      options.fallbackMessage,
      response.status,
      "unreadable_body",
      isRetryableStatus(response.status),
    );
  }
  if (!body.trim()) {
    if (options.logFailures !== false) {
      logApiIssue(options.operation, response.status, contentType, "empty_body");
    }
    throw new ApiResponseError(
      options.fallbackMessage,
      response.status,
      "empty_body",
      isRetryableStatus(response.status),
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    if (options.logFailures !== false) {
      logApiIssue(options.operation, response.status, contentType, "invalid_json");
    }
    throw new ApiResponseError(
      options.fallbackMessage,
      response.status,
      "invalid_json",
      isRetryableStatus(response.status) || response.status === 200,
    );
  }

  if (!response.ok) {
    const code = errorCodeFrom(data) || `http_${response.status}`;
    if (options.logFailures !== false) {
      logApiIssue(options.operation, response.status, contentType, code);
    }
    throw new ApiResponseError(
      options.messageForCode?.(code, response.status) ?? options.fallbackMessage,
      response.status,
      code,
      isRetryableStatus(response.status),
    );
  }

  return data as T;
}

export async function requestJsonWithRetry<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: ApiJsonOptions,
  retryOptions: ApiRetryOptions = {},
): Promise<T> {
  const maxRetries = Math.max(0, Math.min(3, retryOptions.maxRetries ?? 2));
  const baseDelayMs = Math.max(0, retryOptions.baseDelayMs ?? 350);

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await requestJson<T>(input, init, { ...options, logFailures: false });
    } catch (error) {
      if (!(error instanceof ApiResponseError) || !error.retryable || attempt >= maxRetries) {
        if (error instanceof ApiResponseError) {
          console.warn("[api] request failed after retries", {
            operation: options.operation,
            status: error.status,
            code: error.code,
          });
        }
        throw error;
      }
      await new Promise((resolve) => {
        globalThis.setTimeout(resolve, baseDelayMs * (2 ** attempt));
      });
    }
  }
}

async function withFreshBearerToken<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: ApiJsonOptions,
  getToken: ClerkTokenGetter,
  onUnauthorized: (() => void) | undefined,
  perform: (authorizedInit: RequestInit) => Promise<T>,
): Promise<T> {
  let refreshed = false;

  for (;;) {
    const token = await getToken(refreshed ? { skipCache: true } : undefined);
    if (!token) {
      const error = new ApiResponseError(
        "Oturum doğrulanamadı. Yeniden giriş yap.",
        401,
        "session_missing",
        false,
      );
      onUnauthorized?.();
      throw error;
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const authorizedInit: RequestInit = {
      ...init,
      headers,
      credentials: init.credentials ?? "include",
    };

    try {
      return await perform(authorizedInit);
    } catch (error) {
      if (!(error instanceof ApiResponseError) || error.status !== 401) {
        throw error;
      }
      if (!refreshed) {
        refreshed = true;
        continue;
      }
      onUnauthorized?.();
      throw error;
    }
  }
}

export function requestAuthenticatedJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: ApiJsonOptions,
  getToken: ClerkTokenGetter,
  onUnauthorized?: () => void,
): Promise<T> {
  return withFreshBearerToken(
    input,
    init,
    options,
    getToken,
    onUnauthorized,
    (authorizedInit) => requestJson<T>(input, authorizedInit, options),
  );
}

export function requestAuthenticatedJsonWithRetry<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: ApiJsonOptions,
  getToken: ClerkTokenGetter,
  onUnauthorized?: () => void,
  retryOptions: ApiRetryOptions = {},
): Promise<T> {
  return withFreshBearerToken(
    input,
    init,
    options,
    getToken,
    onUnauthorized,
    (authorizedInit) =>
      requestJsonWithRetry<T>(input, authorizedInit, options, retryOptions),
  );
}
