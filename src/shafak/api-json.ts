export type ApiJsonOptions = {
  operation: string;
  fallbackMessage: string;
  messageForCode?: (code: string, status: number) => string;
};

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
    console.warn("[api] network request failed", { operation: options.operation, name: error instanceof Error ? error.name : "unknown" });
    throw new ApiResponseError(options.fallbackMessage, 0, "network_error", true);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!isJsonContentType(contentType)) {
    logApiIssue(options.operation, response.status, contentType, "invalid_content_type");
    throw new ApiResponseError(
      options.fallbackMessage,
      response.status,
      "invalid_content_type",
      response.status === 0 || response.status >= 500 || response.status === 200,
    );
  }

  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    console.warn("[api] response body read failed", { operation: options.operation, status: response.status });
    throw new ApiResponseError(options.fallbackMessage, response.status, "unreadable_body", true);
  }
  if (!body.trim()) {
    logApiIssue(options.operation, response.status, contentType, "empty_body");
    throw new ApiResponseError(options.fallbackMessage, response.status, "empty_body", response.status >= 500);
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    logApiIssue(options.operation, response.status, contentType, "invalid_json");
    throw new ApiResponseError(options.fallbackMessage, response.status, "invalid_json", response.status >= 500 || response.status === 200);
  }

  if (!response.ok) {
    const code = errorCodeFrom(data) || `http_${response.status}`;
    logApiIssue(options.operation, response.status, contentType, code);
    throw new ApiResponseError(
      options.messageForCode?.(code, response.status) ?? options.fallbackMessage,
      response.status,
      code,
      response.status >= 500,
    );
  }

  return data as T;
}
