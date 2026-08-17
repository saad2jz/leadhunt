import { z } from "zod";

export const needProfileSchema = z.object({
  solutionType: z.string().trim().min(2).max(300),
  targetSizeMin: z.number().int().min(0).default(0),
  targetSizeMax: z.number().int().positive().default(10_000),
  geoZones: z.array(z.string().trim().min(1)).max(20).default([]),
  sectors: z.array(z.string().trim().min(1)).max(30).default([]),
  budgetType: z.string().trim().max(80).default("Non précisé"),
  buySignals: z.array(z.string().trim().min(1)).max(20).default([]),
  decisionRoles: z.array(z.string().trim().min(1)).max(20).default([]),
  maxEntitiesForLLM: z.number().int().min(1).max(25).default(5),
}).refine((value) => value.targetSizeMin <= value.targetSizeMax, {
  message: "La taille minimale doit être inférieure à la taille maximale",
  path: ["targetSizeMax"],
});

export const discoverCompaniesSchema = z.object({
  entryType: z.enum(["company", "keywords"]),
  entryValue: z.string().trim().min(2).max(200),
  needProfile: needProfileSchema,
});

export const searchIdSchema = z.object({ searchId: z.string().min(1).max(128) });

export const manualContactSchema = z.object({
  searchId: z.string().min(1).max(128),
  companyId: z.string().min(1).max(128),
  contactData: z.object({
    name: z.string().trim().min(2).max(120),
    role: z.string().trim().min(2).max(120),
    seniority: z.string().trim().max(80).default("Non précisé"),
    linkedinUrl: z.string().url().startsWith("https://").optional(),
  }),
});

export const feedbackSchema = z.object({
  searchId: z.string().min(1).max(128),
  entityId: z.string().min(1).max(128),
  entityType: z.enum(["company", "contact"]),
  vote: z.enum(["relevant", "not_relevant"]),
  scoreBreakdownAtVote: z.record(z.number().min(0).max(1)).default({}),
});

export type NeedProfile = z.infer<typeof needProfileSchema>;

