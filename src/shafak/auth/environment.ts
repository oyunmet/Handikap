export type AuthExperience = "clerk" | "guest" | "setup";

export function getAuthExperience({
  hasClerkKey,
  isDevelopment,
  vercelEnvironment,
}: {
  hasClerkKey: boolean;
  isDevelopment: boolean;
  vercelEnvironment: string;
}): AuthExperience {
  if (hasClerkKey) return "clerk";
  if (isDevelopment || vercelEnvironment === "preview") return "guest";
  return "setup";
}
