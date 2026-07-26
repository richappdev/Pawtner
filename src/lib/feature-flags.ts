export type FeatureFlagKey = "ai" | "commerce" | "matching" | (string & {});

const DEFAULT_FLAGS: Readonly<Record<string, boolean>> = {
  ai: true,
  commerce: true,
  matching: true,
  firebase_auth: false,
};

function parseFlag(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return undefined;
  }
}

export function getFlag(key: FeatureFlagKey): boolean {
  const normalizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const environmentValue =
    parseFlag(process.env[`FEATURE_${normalizedKey}_ENABLED`]) ??
    parseFlag(process.env[`FEATURE_${normalizedKey}`]);

  return environmentValue ?? DEFAULT_FLAGS[key] ?? false;
}
