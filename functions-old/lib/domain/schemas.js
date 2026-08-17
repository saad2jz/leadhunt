"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackSchema = exports.manualContactSchema = exports.searchIdSchema = exports.discoverCompaniesSchema = exports.needProfileSchema = void 0;
const zod_1 = require("zod");
exports.needProfileSchema = zod_1.z.object({
    solutionType: zod_1.z.string().trim().min(2).max(300),
    targetSizeMin: zod_1.z.number().int().min(0).default(0),
    targetSizeMax: zod_1.z.number().int().positive().default(10_000),
    geoZones: zod_1.z.array(zod_1.z.string().trim().min(1)).max(20).default([]),
    sectors: zod_1.z.array(zod_1.z.string().trim().min(1)).max(30).default([]),
    budgetType: zod_1.z.string().trim().max(80).default("Non précisé"),
    buySignals: zod_1.z.array(zod_1.z.string().trim().min(1)).max(20).default([]),
    decisionRoles: zod_1.z.array(zod_1.z.string().trim().min(1)).max(20).default([]),
    maxEntitiesForLLM: zod_1.z.number().int().min(1).max(25).default(5),
}).refine((value) => value.targetSizeMin <= value.targetSizeMax, {
    message: "La taille minimale doit être inférieure à la taille maximale",
    path: ["targetSizeMax"],
});
exports.discoverCompaniesSchema = zod_1.z.object({
    entryType: zod_1.z.enum(["company", "keywords"]),
    entryValue: zod_1.z.string().trim().min(2).max(200),
    needProfile: exports.needProfileSchema,
});
exports.searchIdSchema = zod_1.z.object({ searchId: zod_1.z.string().min(1).max(128) });
exports.manualContactSchema = zod_1.z.object({
    searchId: zod_1.z.string().min(1).max(128),
    companyId: zod_1.z.string().min(1).max(128),
    contactData: zod_1.z.object({
        name: zod_1.z.string().trim().min(2).max(120),
        role: zod_1.z.string().trim().min(2).max(120),
        seniority: zod_1.z.string().trim().max(80).default("Non précisé"),
        linkedinUrl: zod_1.z.string().url().startsWith("https://").optional(),
    }),
});
exports.feedbackSchema = zod_1.z.object({
    searchId: zod_1.z.string().min(1).max(128),
    entityId: zod_1.z.string().min(1).max(128),
    entityType: zod_1.z.enum(["company", "contact"]),
    vote: zod_1.z.enum(["relevant", "not_relevant"]),
    scoreBreakdownAtVote: zod_1.z.record(zod_1.z.number().min(0).max(1)).default({}),
});
