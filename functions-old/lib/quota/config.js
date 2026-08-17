"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaLimitFor = quotaLimitFor;
const DEFAULT_LIMITS = {
    hunter: 50,
    apollo: 75,
    pappers: 100,
};
const ENV_NAMES = {
    hunter: "API_QUOTA_HUNTER",
    apollo: "API_QUOTA_APOLLO",
    pappers: "API_QUOTA_PAPPERS",
};
function quotaLimitFor(apiName, env = process.env) {
    const envName = ENV_NAMES[apiName];
    const raw = env[envName];
    if (raw === undefined || raw.trim() === "")
        return DEFAULT_LIMITS[apiName];
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
        throw new Error(`${envName} doit être un entier positif ou nul`);
    }
    return parsed;
}
