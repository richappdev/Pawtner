const CLOUD_RUN_HOST_SUFFIX = ".run.app";

export function isBlockedDirectCloudRunRequest(
  frontendEnvironment: string | undefined,
  host: string,
) {
  const hostname = host.split(":", 1)[0]?.toLowerCase() ?? "";

  return (
    frontendEnvironment === "staging" &&
    hostname.endsWith(CLOUD_RUN_HOST_SUFFIX)
  );
}
