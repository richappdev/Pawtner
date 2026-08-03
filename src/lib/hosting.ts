const CLOUD_RUN_HOST_SUFFIX = ".run.app";

export function isBlockedDirectCloudRunRequest(
  frontendEnvironment: string | undefined,
  hostname: string,
) {
  return (
    frontendEnvironment === "staging" &&
    hostname.toLowerCase().endsWith(CLOUD_RUN_HOST_SUFFIX)
  );
}
