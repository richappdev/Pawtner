export function isBlockedStagingApiRequest(
  frontendEnvironment: string | undefined,
  pathname: string,
) {
  return frontendEnvironment === "staging" && pathname.startsWith("/api/");
}
