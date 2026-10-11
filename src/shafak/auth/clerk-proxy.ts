export function getClerkProxyUrl(value?: string): string | undefined {
  const candidate = value?.trim();
  if (!candidate || /\s/.test(candidate)) return undefined;

  if (candidate.startsWith("/")) {
    return candidate.startsWith("//") ? undefined : candidate;
  }

  if (!/^https?:\/\//i.test(candidate)) return undefined;

  try {
    const url = new URL(candidate);
    if (!url.hostname || url.username || url.password) return undefined;
    return candidate;
  } catch {
    return undefined;
  }
}
