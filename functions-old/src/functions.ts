import { getFunctions } from "firebase-admin/functions";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { z } from "zod";
import {
  discoverCompaniesSchema, feedbackSchema, manualContactSchema,
  needProfileSchema, searchIdSchema,
} from "./domain/schemas.js";
import { DEFAULT_WEIGHTS, scoreCompany, type ScoringWeights } from "./domain/scoring.js";
import { ApiQuotaService } from "./quota/apiQuotaService.js";
import { FirestoreApiUsageRepository } from "./quota/firestoreApiUsageRepository.js";
import { enrichCompany } from "./services/companyEnrichment.js";
import { enrichDecisionMakers } from "./services/decisionMakerEnrichment.js";

const db = getFirestore();
const region = "europe-west1";
const quota = new ApiQuotaService(new FirestoreApiUsageRepository(db));

const success = <T>(data: T) => ({ success: true as const, error: null, data });
const failure = (error: unknown) => ({ success: false as const, error: error instanceof Error ? error.message : "Erreur inconnue", data: null });
const requireUser = (uid?: string) => { if (!uid) throw new HttpsError("unauthenticated", "Authentification requise"); return uid; };
const parse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) throw new HttpsError("invalid-argument", result.error.issues[0]?.message ?? "Données invalides");
  return result.data;
};

const mockCompanies = [
  { name: "Lumon Systems", sector: "SaaS RH", size: 240, geo: "France", website: "lumon.example", rawSignals: { financial: true, hiring: true, technical: true, lastSignalDate: "2026-08-08" } },
  { name: "Nova Industrie", sector: "Industrie 4.0", size: 780, geo: "France", website: "nova.example", rawSignals: { financial: false, hiring: true, technical: true, lastSignalDate: "2026-07-24" } },
  { name: "Atlas Finance", sector: "Fintech", size: 95, geo: "France", website: "atlas.example", rawSignals: { financial: true, hiring: true, technical: false, lastSignalDate: "2026-08-13" } },
  { name: "Verde Retail", sector: "Retail", size: 430, geo: "Belgique", website: "verde.example", rawSignals: { financial: false, hiring: false, technical: true, lastSignalDate: "2026-08-02" } },
];

async function assertSearchOwner(searchId: string, userId: string) {
  const ref = db.collection("searches").doc(searchId);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.get("userId") !== userId) throw new HttpsError("not-found", "Recherche introuvable");
  return { ref, snapshot };
}

async function runSearch(searchId: string, userId: string) {
  const { ref, snapshot } = await assertSearchOwner(searchId, userId);
  const need = needProfileSchema.parse(snapshot.get("needProfile"));
  await ref.update({ status: "processing", progress: 15, updatedAt: FieldValue.serverTimestamp() });
  const weightDoc = await db.doc(`users/${userId}/settings/scoringWeights`).get();
  const weights = weightDoc.exists ? weightDoc.data() as ScoringWeights : DEFAULT_WEIGHTS;
  const batch = db.batch();
  for (const [index, candidate] of mockCompanies.entries()) {
    const id = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const cached = await db.collection("companiesCache").doc(id).get();
    const fresh = cached.exists && cached.get("enrichedAt") instanceof Timestamp && Date.now() - (cached.get("enrichedAt") as Timestamp).toMillis() < 30 * 86_400_000;
    if (!fresh) {
      await enrichCompany(candidate.name, {
        quota,
        sirene: { find: async () => ({ siren: `demo-${index}`, name: candidate.name, sector: candidate.sector, size: candidate.size }) },
        pappers: { enrich: async () => ({ financials: {} }) },
      });
    }
    const company = fresh ? { ...candidate, ...cached.data() } : candidate;
    const score = scoreCompany(company, need);
    batch.set(ref.collection("companies").doc(id), { ...company, ...score, crmStatus: "new", createdAt: FieldValue.serverTimestamp() });
    if (!fresh) batch.set(db.collection("companiesCache").doc(id), { ...company, enrichedAt: FieldValue.serverTimestamp() }, { merge: true });
    await ref.update({ progress: 25 + index * 15 });
  }
  await batch.commit();
  await ref.update({ status: "done", progress: 100, completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
}

export const discoverCompanies = onCall({ region }, async (request) => {
  try {
    const userId = requireUser(request.auth?.uid);
    const input = parse(discoverCompaniesSchema, request.data);
    const ref = db.collection("searches").doc();
    await ref.set({ userId, ...input, status: "pending", progress: 0, createdAt: FieldValue.serverTimestamp() });
    try {
      await getFunctions().taskQueue("processSearch").enqueue({ searchId: ref.id, userId });
    } catch {
      // L'émulateur et certains projets sans Cloud Tasks utilisent ce chemin local.
      await runSearch(ref.id, userId);
    }
    return success({ searchId: ref.id, status: "pending" });
  } catch (error) { if (error instanceof HttpsError) throw error; return failure(error); }
});

export const processSearch = onTaskDispatched({ region, retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 }, rateLimits: { maxConcurrentDispatches: 3 } }, async (request) => {
  const input = parse(z.object({ searchId: z.string(), userId: z.string() }), request.data);
  await runSearch(input.searchId, input.userId);
});

export const discoverDecisionMakers = onCall({ region }, async (request) => {
  try {
    const userId = requireUser(request.auth?.uid);
    const input = parse(searchIdSchema.extend({ companyId: z.string().min(1) }), request.data);
    const { ref } = await assertSearchOwner(input.searchId, userId);
    const company = await ref.collection("companies").doc(input.companyId).get();
    if (!company.exists) throw new HttpsError("not-found", "Entreprise introuvable");
    const enrichment = await enrichDecisionMakers(String(company.get("website") ?? "example.fr"), {
      quota,
      hunter: { find: async () => [{ name: "Claire Moreau", role: "DSI" }, { name: "Nicolas Rey", role: "Head of Procurement" }] },
      apollo: { find: async () => [{ name: "Sophie Bernard", role: "CTO" }] },
    });
    const names = enrichment.contacts.map(contact => [contact.name, contact.role]);
    const batch = db.batch();
    names.forEach(([name, role]) => batch.set(company.ref.collection("contacts").doc(), { name, role, seniority: role === "DSI" ? "C-level" : "Head", confidence: "medium", verifiedAt: FieldValue.serverTimestamp(), source: "api" }));
    await batch.commit();
    return success({ count: names.length, source: enrichment.source, skippedForQuota: enrichment.skippedForQuota });
  } catch (error) { if (error instanceof HttpsError) throw error; return failure(error); }
});

export const addManualContact = onCall({ region }, async (request) => {
  const userId = requireUser(request.auth?.uid);
  const input = parse(manualContactSchema, request.data);
  const { ref } = await assertSearchOwner(input.searchId, userId);
  const contact = await ref.collection("companies").doc(input.companyId).collection("contacts").add({ ...input.contactData, source: "manual", confidence: "manual", verifiedAt: FieldValue.serverTimestamp() });
  return success({ contactId: contact.id });
});

async function anthropicJson(prompt: string): Promise<Record<string, unknown> | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6", max_tokens: 1200, messages: [{ role: "user", content: `${prompt}\nRéponds uniquement avec du JSON valide.` }] }) });
  if (!response.ok) throw new Error(`Anthropic: ${response.status}`);
  const data = await response.json() as { content?: Array<{ text?: string }> };
  return JSON.parse(data.content?.[0]?.text ?? "{}") as Record<string, unknown>;
}

export const generatePersona = onCall({ region, timeoutSeconds: 60 }, async (request) => {
  const userId = requireUser(request.auth?.uid);
  const input = parse(z.object({ searchId: z.string(), roleTarget: z.string().min(2), needProfile: needProfileSchema }), request.data);
  const { ref } = await assertSearchOwner(input.searchId, userId);
  const generated = await anthropicJson(`Crée un buyer persona B2B pour ${input.roleTarget}, besoin: ${input.needProfile.solutionType}. Champs: motivations, objections, vocabulary, kpis.`);
  const persona = generated ?? { roleTarget: input.roleTarget, motivations: ["Réduire le risque", "Accélérer les opérations"], objections: ["Temps d'intégration", "ROI"], vocabulary: ["Maîtrise", "Visibilité", "Déploiement progressif"], kpis: ["MTTR", "Coût par service", "Adoption"] };
  const doc = await ref.collection("personas").add({ ...persona, roleTarget: input.roleTarget, createdAt: FieldValue.serverTimestamp() });
  return success({ personaId: doc.id, persona });
});

export const scoreEntities = onCall({ region }, async (request) => {
  const userId = requireUser(request.auth?.uid); const { searchId } = parse(searchIdSchema, request.data);
  const { ref, snapshot } = await assertSearchOwner(searchId, userId); const need = needProfileSchema.parse(snapshot.get("needProfile"));
  const weightDoc = await db.doc(`users/${userId}/settings/scoringWeights`).get(); const weights = weightDoc.exists ? weightDoc.data() as ScoringWeights : DEFAULT_WEIGHTS;
  const companies = await ref.collection("companies").get(); const batch = db.batch();
  companies.docs.forEach(doc => batch.update(doc.ref, scoreCompany(doc.data(), need, weights))); await batch.commit();
  return success({ count: companies.size });
});

export const generateApproach = onCall({ region, timeoutSeconds: 60 }, async (request) => {
  const userId = requireUser(request.auth?.uid); const input = parse(searchIdSchema.extend({ companyId: z.string(), personaId: z.string() }), request.data);
  const { ref, snapshot } = await assertSearchOwner(input.searchId, userId); const company = await ref.collection("companies").doc(input.companyId).get();
  if (!company.exists) throw new HttpsError("not-found", "Entreprise introuvable");
  const top = await ref.collection("companies").orderBy("fitScore", "desc").limit(snapshot.get("needProfile.maxEntitiesForLLM") ?? 5).get();
  if (!top.docs.some(doc => doc.id === input.companyId)) throw new HttpsError("resource-exhausted", "Cette entreprise est hors du quota LLM de la recherche");
  const generated = await anthropicJson(`Crée un plan d'approche pour ${company.get("name")}. Champs: recommendedChannel, hookAngle, sequenceSteps (3), draftMessage.`);
  const approach = generated ?? { recommendedChannel: "Email puis LinkedIn", hookAngle: "Transformer les signaux de croissance en maîtrise opérationnelle", sequenceSteps: ["Email contextualisé", "Connexion LinkedIn", "Relance avec preuve"], draftMessage: `Bonjour, j'ai remarqué les signaux de croissance chez ${company.get("name")}. Est-ce un sujet d'actualité pour vous ?` };
  await ref.collection("approachPlans").doc(input.companyId).set({ ...approach, personaId: input.personaId, createdAt: FieldValue.serverTimestamp() });
  return success(approach);
});

export const recordFeedback = onCall({ region }, async (request) => {
  const userId = requireUser(request.auth?.uid); const input = parse(feedbackSchema, request.data); const { ref } = await assertSearchOwner(input.searchId, userId);
  await ref.collection("feedback").doc(`${input.entityType}-${input.entityId}`).set({ ...input, userId, createdAt: FieldValue.serverTimestamp() }); return success({ recorded: true });
});

export const recalibrateWeights = onSchedule({ region, schedule: "every monday 03:00", timeZone: "Europe/Paris" }, async () => {
  const users = await db.collection("users").get();
  for (const user of users.docs) {
    const searches = await db.collection("searches").where("userId", "==", user.id).get();
    const feedback = (await Promise.all(searches.docs.map(doc => doc.ref.collection("feedback").get()))).flatMap(s => s.docs.map(d => d.data()));
    if (feedback.length < 5) continue;
    const positives = feedback.filter(item => item.vote === "relevant"); const averages: Record<string, number> = {};
    for (const item of positives) for (const [key, value] of Object.entries(item.scoreBreakdownAtVote ?? {})) averages[key] = (averages[key] ?? 0) + Number(value);
    const keys = Object.keys(averages); const total = keys.reduce((sum, key) => sum + (averages[key] ?? 0), 0) || 1;
    const fitWeights = { ...DEFAULT_WEIGHTS.fitWeights } as Record<string, number>; keys.forEach(key => { if (key in fitWeights) fitWeights[key] = Math.max(.1, (averages[key] ?? 0) / total); });
    const normalizedTotal = Object.values(fitWeights).reduce((a,b) => a+b,0); Object.keys(fitWeights).forEach(key => { fitWeights[key] = (fitWeights[key] ?? 0) / normalizedTotal; });
    await db.doc(`users/${user.id}/settings/scoringWeights`).set({ fitWeights, timingWeights: DEFAULT_WEIGHTS.timingWeights, recalibratedAt: FieldValue.serverTimestamp(), sampleSize: feedback.length });
  }
});

export const exportResults = onCall({ region }, async (request) => {
  const userId = requireUser(request.auth?.uid); const input = parse(searchIdSchema.extend({ format: z.literal("csv").default("csv") }), request.data); const { ref } = await assertSearchOwner(input.searchId, userId);
  const companies = await ref.collection("companies").orderBy("fitScore", "desc").get(); const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [["Entreprise","Secteur","Effectif","Zone","Site","Fit","Timing","CRM"].map(escape).join(","), ...companies.docs.map(doc => { const c = doc.data(); return [c.name,c.sector,c.size,c.geo,c.website,c.fitScore,c.timingScore,c.crmStatus].map(escape).join(","); })];
  return success({ filename: `prospection-${input.searchId}.csv`, content: lines.join("\n"), contentType: "text/csv;charset=utf-8" });
});
