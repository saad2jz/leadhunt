"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportResults = exports.recalibrateWeights = exports.recordFeedback = exports.generateApproach = exports.scoreEntities = exports.generatePersona = exports.addManualContact = exports.discoverDecisionMakers = exports.processSearch = exports.discoverCompanies = void 0;
const functions_1 = require("firebase-admin/functions");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const tasks_1 = require("firebase-functions/v2/tasks");
const zod_1 = require("zod");
const schemas_js_1 = require("./domain/schemas.js");
const scoring_js_1 = require("./domain/scoring.js");
const apiQuotaService_js_1 = require("./quota/apiQuotaService.js");
const firestoreApiUsageRepository_js_1 = require("./quota/firestoreApiUsageRepository.js");
const companyEnrichment_js_1 = require("./services/companyEnrichment.js");
const decisionMakerEnrichment_js_1 = require("./services/decisionMakerEnrichment.js");
const db = (0, firestore_1.getFirestore)();
const region = "europe-west1";
const quota = new apiQuotaService_js_1.ApiQuotaService(new firestoreApiUsageRepository_js_1.FirestoreApiUsageRepository(db));
const success = (data) => ({ success: true, error: null, data });
const failure = (error) => ({ success: false, error: error instanceof Error ? error.message : "Erreur inconnue", data: null });
const requireUser = (uid) => { if (!uid)
    throw new https_1.HttpsError("unauthenticated", "Authentification requise"); return uid; };
const parse = (schema, data) => {
    const result = schema.safeParse(data);
    if (!result.success)
        throw new https_1.HttpsError("invalid-argument", result.error.issues[0]?.message ?? "Données invalides");
    return result.data;
};
const mockCompanies = [
    { name: "Lumon Systems", sector: "SaaS RH", size: 240, geo: "France", website: "lumon.example", rawSignals: { financial: true, hiring: true, technical: true, lastSignalDate: "2026-08-08" } },
    { name: "Nova Industrie", sector: "Industrie 4.0", size: 780, geo: "France", website: "nova.example", rawSignals: { financial: false, hiring: true, technical: true, lastSignalDate: "2026-07-24" } },
    { name: "Atlas Finance", sector: "Fintech", size: 95, geo: "France", website: "atlas.example", rawSignals: { financial: true, hiring: true, technical: false, lastSignalDate: "2026-08-13" } },
    { name: "Verde Retail", sector: "Retail", size: 430, geo: "Belgique", website: "verde.example", rawSignals: { financial: false, hiring: false, technical: true, lastSignalDate: "2026-08-02" } },
];
async function assertSearchOwner(searchId, userId) {
    const ref = db.collection("searches").doc(searchId);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.get("userId") !== userId)
        throw new https_1.HttpsError("not-found", "Recherche introuvable");
    return { ref, snapshot };
}
async function runSearch(searchId, userId) {
    const { ref, snapshot } = await assertSearchOwner(searchId, userId);
    const need = schemas_js_1.needProfileSchema.parse(snapshot.get("needProfile"));
    await ref.update({ status: "processing", progress: 15, updatedAt: firestore_1.FieldValue.serverTimestamp() });
    const weightDoc = await db.doc(`users/${userId}/settings/scoringWeights`).get();
    const weights = weightDoc.exists ? weightDoc.data() : scoring_js_1.DEFAULT_WEIGHTS;
    const batch = db.batch();
    for (const [index, candidate] of mockCompanies.entries()) {
        const id = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const cached = await db.collection("companiesCache").doc(id).get();
        const fresh = cached.exists && cached.get("enrichedAt") instanceof firestore_1.Timestamp && Date.now() - cached.get("enrichedAt").toMillis() < 30 * 86_400_000;
        if (!fresh) {
            await (0, companyEnrichment_js_1.enrichCompany)(candidate.name, {
                quota,
                sirene: { find: async () => ({ siren: `demo-${index}`, name: candidate.name, sector: candidate.sector, size: candidate.size }) },
                pappers: { enrich: async () => ({ financials: {} }) },
            });
        }
        const company = fresh ? { ...candidate, ...cached.data() } : candidate;
        const score = (0, scoring_js_1.scoreCompany)(company, need);
        batch.set(ref.collection("companies").doc(id), { ...company, ...score, crmStatus: "new", createdAt: firestore_1.FieldValue.serverTimestamp() });
        if (!fresh)
            batch.set(db.collection("companiesCache").doc(id), { ...company, enrichedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        await ref.update({ progress: 25 + index * 15 });
    }
    await batch.commit();
    await ref.update({ status: "done", progress: 100, completedAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() });
}
exports.discoverCompanies = (0, https_1.onCall)({ region }, async (request) => {
    try {
        const userId = requireUser(request.auth?.uid);
        const input = parse(schemas_js_1.discoverCompaniesSchema, request.data);
        const ref = db.collection("searches").doc();
        await ref.set({ userId, ...input, status: "pending", progress: 0, createdAt: firestore_1.FieldValue.serverTimestamp() });
        try {
            await (0, functions_1.getFunctions)().taskQueue("processSearch").enqueue({ searchId: ref.id, userId });
        }
        catch {
            // L'émulateur et certains projets sans Cloud Tasks utilisent ce chemin local.
            await runSearch(ref.id, userId);
        }
        return success({ searchId: ref.id, status: "pending" });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        return failure(error);
    }
});
exports.processSearch = (0, tasks_1.onTaskDispatched)({ region, retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 }, rateLimits: { maxConcurrentDispatches: 3 } }, async (request) => {
    const input = parse(zod_1.z.object({ searchId: zod_1.z.string(), userId: zod_1.z.string() }), request.data);
    await runSearch(input.searchId, input.userId);
});
exports.discoverDecisionMakers = (0, https_1.onCall)({ region }, async (request) => {
    try {
        const userId = requireUser(request.auth?.uid);
        const input = parse(schemas_js_1.searchIdSchema.extend({ companyId: zod_1.z.string().min(1) }), request.data);
        const { ref } = await assertSearchOwner(input.searchId, userId);
        const company = await ref.collection("companies").doc(input.companyId).get();
        if (!company.exists)
            throw new https_1.HttpsError("not-found", "Entreprise introuvable");
        const enrichment = await (0, decisionMakerEnrichment_js_1.enrichDecisionMakers)(String(company.get("website") ?? "example.fr"), {
            quota,
            hunter: { find: async () => [{ name: "Claire Moreau", role: "DSI" }, { name: "Nicolas Rey", role: "Head of Procurement" }] },
            apollo: { find: async () => [{ name: "Sophie Bernard", role: "CTO" }] },
        });
        const names = enrichment.contacts.map(contact => [contact.name, contact.role]);
        const batch = db.batch();
        names.forEach(([name, role]) => batch.set(company.ref.collection("contacts").doc(), { name, role, seniority: role === "DSI" ? "C-level" : "Head", confidence: "medium", verifiedAt: firestore_1.FieldValue.serverTimestamp(), source: "api" }));
        await batch.commit();
        return success({ count: names.length, source: enrichment.source, skippedForQuota: enrichment.skippedForQuota });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        return failure(error);
    }
});
exports.addManualContact = (0, https_1.onCall)({ region }, async (request) => {
    const userId = requireUser(request.auth?.uid);
    const input = parse(schemas_js_1.manualContactSchema, request.data);
    const { ref } = await assertSearchOwner(input.searchId, userId);
    const contact = await ref.collection("companies").doc(input.companyId).collection("contacts").add({ ...input.contactData, source: "manual", confidence: "manual", verifiedAt: firestore_1.FieldValue.serverTimestamp() });
    return success({ contactId: contact.id });
});
async function anthropicJson(prompt) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key)
        return null;
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6", max_tokens: 1200, messages: [{ role: "user", content: `${prompt}\nRéponds uniquement avec du JSON valide.` }] }) });
    if (!response.ok)
        throw new Error(`Anthropic: ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.content?.[0]?.text ?? "{}");
}
exports.generatePersona = (0, https_1.onCall)({ region, timeoutSeconds: 60 }, async (request) => {
    const userId = requireUser(request.auth?.uid);
    const input = parse(zod_1.z.object({ searchId: zod_1.z.string(), roleTarget: zod_1.z.string().min(2), needProfile: schemas_js_1.needProfileSchema }), request.data);
    const { ref } = await assertSearchOwner(input.searchId, userId);
    const generated = await anthropicJson(`Crée un buyer persona B2B pour ${input.roleTarget}, besoin: ${input.needProfile.solutionType}. Champs: motivations, objections, vocabulary, kpis.`);
    const persona = generated ?? { roleTarget: input.roleTarget, motivations: ["Réduire le risque", "Accélérer les opérations"], objections: ["Temps d'intégration", "ROI"], vocabulary: ["Maîtrise", "Visibilité", "Déploiement progressif"], kpis: ["MTTR", "Coût par service", "Adoption"] };
    const doc = await ref.collection("personas").add({ ...persona, roleTarget: input.roleTarget, createdAt: firestore_1.FieldValue.serverTimestamp() });
    return success({ personaId: doc.id, persona });
});
exports.scoreEntities = (0, https_1.onCall)({ region }, async (request) => {
    const userId = requireUser(request.auth?.uid);
    const { searchId } = parse(schemas_js_1.searchIdSchema, request.data);
    const { ref, snapshot } = await assertSearchOwner(searchId, userId);
    const need = schemas_js_1.needProfileSchema.parse(snapshot.get("needProfile"));
    const weightDoc = await db.doc(`users/${userId}/settings/scoringWeights`).get();
    const weights = weightDoc.exists ? weightDoc.data() : scoring_js_1.DEFAULT_WEIGHTS;
    const companies = await ref.collection("companies").get();
    const batch = db.batch();
    companies.docs.forEach(doc => batch.update(doc.ref, (0, scoring_js_1.scoreCompany)(doc.data(), need, weights)));
    await batch.commit();
    return success({ count: companies.size });
});
exports.generateApproach = (0, https_1.onCall)({ region, timeoutSeconds: 60 }, async (request) => {
    const userId = requireUser(request.auth?.uid);
    const input = parse(schemas_js_1.searchIdSchema.extend({ companyId: zod_1.z.string(), personaId: zod_1.z.string() }), request.data);
    const { ref, snapshot } = await assertSearchOwner(input.searchId, userId);
    const company = await ref.collection("companies").doc(input.companyId).get();
    if (!company.exists)
        throw new https_1.HttpsError("not-found", "Entreprise introuvable");
    const top = await ref.collection("companies").orderBy("fitScore", "desc").limit(snapshot.get("needProfile.maxEntitiesForLLM") ?? 5).get();
    if (!top.docs.some(doc => doc.id === input.companyId))
        throw new https_1.HttpsError("resource-exhausted", "Cette entreprise est hors du quota LLM de la recherche");
    const generated = await anthropicJson(`Crée un plan d'approche pour ${company.get("name")}. Champs: recommendedChannel, hookAngle, sequenceSteps (3), draftMessage.`);
    const approach = generated ?? { recommendedChannel: "Email puis LinkedIn", hookAngle: "Transformer les signaux de croissance en maîtrise opérationnelle", sequenceSteps: ["Email contextualisé", "Connexion LinkedIn", "Relance avec preuve"], draftMessage: `Bonjour, j'ai remarqué les signaux de croissance chez ${company.get("name")}. Est-ce un sujet d'actualité pour vous ?` };
    await ref.collection("approachPlans").doc(input.companyId).set({ ...approach, personaId: input.personaId, createdAt: firestore_1.FieldValue.serverTimestamp() });
    return success(approach);
});
exports.recordFeedback = (0, https_1.onCall)({ region }, async (request) => {
    const userId = requireUser(request.auth?.uid);
    const input = parse(schemas_js_1.feedbackSchema, request.data);
    const { ref } = await assertSearchOwner(input.searchId, userId);
    await ref.collection("feedback").doc(`${input.entityType}-${input.entityId}`).set({ ...input, userId, createdAt: firestore_1.FieldValue.serverTimestamp() });
    return success({ recorded: true });
});
exports.recalibrateWeights = (0, scheduler_1.onSchedule)({ region, schedule: "every monday 03:00", timeZone: "Europe/Paris" }, async () => {
    const users = await db.collection("users").get();
    for (const user of users.docs) {
        const searches = await db.collection("searches").where("userId", "==", user.id).get();
        const feedback = (await Promise.all(searches.docs.map(doc => doc.ref.collection("feedback").get()))).flatMap(s => s.docs.map(d => d.data()));
        if (feedback.length < 5)
            continue;
        const positives = feedback.filter(item => item.vote === "relevant");
        const averages = {};
        for (const item of positives)
            for (const [key, value] of Object.entries(item.scoreBreakdownAtVote ?? {}))
                averages[key] = (averages[key] ?? 0) + Number(value);
        const keys = Object.keys(averages);
        const total = keys.reduce((sum, key) => sum + (averages[key] ?? 0), 0) || 1;
        const fitWeights = { ...scoring_js_1.DEFAULT_WEIGHTS.fitWeights };
        keys.forEach(key => { if (key in fitWeights)
            fitWeights[key] = Math.max(.1, (averages[key] ?? 0) / total); });
        const normalizedTotal = Object.values(fitWeights).reduce((a, b) => a + b, 0);
        Object.keys(fitWeights).forEach(key => { fitWeights[key] = (fitWeights[key] ?? 0) / normalizedTotal; });
        await db.doc(`users/${user.id}/settings/scoringWeights`).set({ fitWeights, timingWeights: scoring_js_1.DEFAULT_WEIGHTS.timingWeights, recalibratedAt: firestore_1.FieldValue.serverTimestamp(), sampleSize: feedback.length });
    }
});
exports.exportResults = (0, https_1.onCall)({ region }, async (request) => {
    const userId = requireUser(request.auth?.uid);
    const input = parse(schemas_js_1.searchIdSchema.extend({ format: zod_1.z.literal("csv").default("csv") }), request.data);
    const { ref } = await assertSearchOwner(input.searchId, userId);
    const companies = await ref.collection("companies").orderBy("fitScore", "desc").get();
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [["Entreprise", "Secteur", "Effectif", "Zone", "Site", "Fit", "Timing", "CRM"].map(escape).join(","), ...companies.docs.map(doc => { const c = doc.data(); return [c.name, c.sector, c.size, c.geo, c.website, c.fitScore, c.timingScore, c.crmStatus].map(escape).join(","); })];
    return success({ filename: `prospection-${input.searchId}.csv`, content: lines.join("\n"), contentType: "text/csv;charset=utf-8" });
});
