import type { MeteredApiName } from "./types.js";

const DEFAULT_LIMITS: Record<MeteredApiName, number> = {
  hunter: 50,
  apollo: 75,
  pappers: 100,
};

const ENV_NAMES: Record<MeteredApiName, string> = {
  hunter: "API_QUOTA_HUNTER",
  apollo: "API_QUOTA_APOLLO",
  pappers: "API_QUOTA_PAPPERS",
};

export function quotaLimitFor(
  apiName: MeteredApiName,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const envName = ENV_NAMES[apiName];
  const raw = env[envName];
  if (raw === undefined || raw.trim() === "") return DEFAULT_LIMITS[apiName];

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${envName} doit être un entier positif ou nul`);
  }
  return parsed;
}

