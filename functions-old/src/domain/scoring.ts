import type { NeedProfile } from "./schemas.js";

export interface ScoringWeights {
  fitWeights: {
    sector: number;
    size: number;
    geo: number;
    decisionMaker: number;
  };
  timingWeights: {
    financial: number;
    hiring: number;
    technical: number;
    recency: number;
  };
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  fitWeights: { sector: 0.3, size: 0.25, geo: 0.2, decisionMaker: 0.25 },
  timingWeights: { financial: 0.3, hiring: 0.3, technical: 0.25, recency: 0.15 },
};

export interface ScorableCompany {
  sector?: string;
  size?: number;
  geo?: string;
  contacts?: Array<{ role?: string }>;
  rawSignals?: {
    financial?: boolean;
    hiring?: boolean;
    technical?: boolean;
    lastSignalDate?: string | Date;
  };
}

const normalized = (value: string) => value.trim().toLocaleLowerCase("fr");
const hasLooseMatch = (value: string | undefined, candidates: string[]) =>
  Boolean(value) && candidates.some((candidate) =>
    normalized(value!).includes(normalized(candidate)) ||
    normalized(candidate).includes(normalized(value!)),
  );

const recencyScore = (value: string | Date | undefined, now: Date): number => {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const days = Math.max(0, (now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 30) return 1;
  if (days <= 90) return 0.65;
  if (days <= 180) return 0.3;
  return 0;
};

const weightedScore = (breakdown: Record<string, number>, weights: Record<string, number>) => {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0) || 1;
  const value = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + (breakdown[key] ?? 0) * weight,
    0,
  );
  return Math.round((value / totalWeight) * 100);
};

export function scoreCompany(
  company: ScorableCompany,
  need: NeedProfile,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  now: Date = new Date(),
) {
  const fitBreakdown = {
    sector: need.sectors.length === 0 ? 1 : Number(hasLooseMatch(company.sector, need.sectors)),
    size: company.size === undefined ? 0 : Number(
      company.size >= need.targetSizeMin && company.size <= need.targetSizeMax,
    ),
    geo: need.geoZones.length === 0 ? 1 : Number(hasLooseMatch(company.geo, need.geoZones)),
    decisionMaker: need.decisionRoles.length === 0 ? 1 : Number(
      company.contacts?.some((contact) => hasLooseMatch(contact.role, need.decisionRoles)) ?? false,
    ),
  };
  const timingBreakdown = {
    financial: Number(Boolean(company.rawSignals?.financial)),
    hiring: Number(Boolean(company.rawSignals?.hiring)),
    technical: Number(Boolean(company.rawSignals?.technical)),
    recency: recencyScore(company.rawSignals?.lastSignalDate, now),
  };

  return {
    fitScore: weightedScore(fitBreakdown, weights.fitWeights),
    fitBreakdown,
    timingScore: weightedScore(timingBreakdown, weights.timingWeights),
    timingBreakdown: {
      ...timingBreakdown,
      lastSignalDate: company.rawSignals?.lastSignalDate ?? null,
    },
  };
}

