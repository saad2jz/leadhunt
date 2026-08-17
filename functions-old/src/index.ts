import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ApiQuotaService } from "./quota/apiQuotaService.js";
import { FirestoreApiUsageRepository } from "./quota/firestoreApiUsageRepository.js";

if (getApps().length === 0) initializeApp();

const db = getFirestore();

// Instance partagée à injecter dans les adaptateurs Hunter, Apollo et Pappers.
// Les fonctions métier réservent un crédit AVANT chaque appel fournisseur.
export const apiQuota = new ApiQuotaService(
  new FirestoreApiUsageRepository(db),
);

export { enrichCompany } from "./services/companyEnrichment.js";
export { enrichDecisionMakers } from "./services/decisionMakerEnrichment.js";
export { ProviderQuotaError } from "./providers/errors.js";
export {
  addManualContact, discoverCompanies, discoverDecisionMakers, exportResults,
  generateApproach, generatePersona, processSearch, recalibrateWeights,
  recordFeedback, scoreEntities,
} from "./functions.js";
