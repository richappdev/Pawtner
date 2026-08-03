const CLOUD_RUN_HOST_SUFFIX = ".run.app";
const STAGING_HOSTING_HOST = "pawtner-tw-staging.web.app";

export function isBlockedDirectCloudRunRequest(
  frontendEnvironment: string | undefined,
  host: string,
  firebaseRequestedHost?: string | null,
) {
  const hostname = host.split(":", 1)[0]?.toLowerCase() ?? "";

  return (
    frontendEnvironment === "staging" &&
    hostname.endsWith(CLOUD_RUN_HOST_SUFFIX) &&
    firebaseRequestedHost?.toLowerCase() !== STAGING_HOSTING_HOST
  );
}

export function isBlockedStagingApiRequest(
  frontendEnvironment: string | undefined,
  pathname: string,
) {
  return frontendEnvironment === "staging" && pathname.startsWith("/api/");
}
