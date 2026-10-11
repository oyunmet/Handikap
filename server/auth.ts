import { getAuth } from "@clerk/express";
import type { Request, Response } from "express";

const clerkReasonCodes: Record<string, string> = {
  "session-token-missing": "header_missing",
  "session-token-and-uat-missing": "header_missing",
  "session-token-expired": "token_expired",
  "token-expired": "token_expired",
  "session-token-iat-in-the-future": "token_iat_in_the_future",
  "token-iat-in-the-future": "token_iat_in_the_future",
  "token-invalid-signature": "token_invalid_signature",
  "token-invalid-authorized-parties": "authorized_party_mismatch",
  "invalid-secret-key": "secret_key_invalid",
  "secret-key-invalid": "secret_key_invalid",
  "token-not-active-yet": "token_not_active_yet",
  "unexpected-error": "token_verification_failed",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenTimeFailure(token: string): string | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) return "token_malformed";

  try {
    const claims = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === "number" && claims.exp <= now) {
      return "token_expired";
    }
    if (typeof claims.nbf === "number" && claims.nbf > now + 30) {
      return "token_not_active_yet";
    }
    if (typeof claims.iat === "number" && claims.iat > now + 30) {
      return "token_iat_in_the_future";
    }
  } catch {
    return "token_malformed";
  }

  return undefined;
}

export function authFailureReason(
  debug: unknown,
  authorization: string | undefined,
): string {
  const rawReason = isRecord(debug) && typeof debug.reason === "string"
    ? debug.reason
    : "";
  if (clerkReasonCodes[rawReason]) return clerkReasonCodes[rawReason];

  const bearer = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer) return "header_missing";
  return tokenTimeFailure(bearer) ?? "token_unverified";
}

export function sendAuthenticationRequired(
  request: Request,
  response: Response,
  debug?: unknown,
) {
  let authDebug = debug;
  if (authDebug === undefined) {
    try {
      authDebug = getAuth(request).debug();
    } catch {
      authDebug = undefined;
    }
  }

  const reason = authFailureReason(authDebug, request.headers.authorization);
  console.warn("[auth] protected request rejected", {
    reason,
    route: request.path,
  });
  response.status(401).json({
    error: "authentication_required",
    reason,
  });
}

export function requireAuthenticatedUserId(
  request: Request,
  response: Response,
): string | null {
  try {
    const auth = getAuth(request);
    if (auth.userId) return auth.userId;
    sendAuthenticationRequired(request, response, auth.debug());
  } catch {
    sendAuthenticationRequired(request, response);
  }
  return null;
}
