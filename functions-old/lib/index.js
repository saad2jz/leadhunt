"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreEntities = exports.recordFeedback = exports.recalibrateWeights = exports.processSearch = exports.generatePersona = exports.generateApproach = exports.exportResults = exports.discoverDecisionMakers = exports.discoverCompanies = exports.addManualContact = exports.ProviderQuotaError = exports.enrichDecisionMakers = exports.enrichCompany = exports.apiQuota = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const apiQuotaService_js_1 = require("./quota/apiQuotaService.js");
const firestoreApiUsageRepository_js_1 = require("./quota/firestoreApiUsageRepository.js");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// Instance partagée à injecter dans les adaptateurs Hunter, Apollo et Pappers.
// Les fonctions métier réservent un crédit AVANT chaque appel fournisseur.
exports.apiQuota = new apiQuotaService_js_1.ApiQuotaService(new firestoreApiUsageRepository_js_1.FirestoreApiUsageRepository(db));
var companyEnrichment_js_1 = require("./services/companyEnrichment.js");
Object.defineProperty(exports, "enrichCompany", { enumerable: true, get: function () { return companyEnrichment_js_1.enrichCompany; } });
var decisionMakerEnrichment_js_1 = require("./services/decisionMakerEnrichment.js");
Object.defineProperty(exports, "enrichDecisionMakers", { enumerable: true, get: function () { return decisionMakerEnrichment_js_1.enrichDecisionMakers; } });
var errors_js_1 = require("./providers/errors.js");
Object.defineProperty(exports, "ProviderQuotaError", { enumerable: true, get: function () { return errors_js_1.ProviderQuotaError; } });
var functions_js_1 = require("./functions.js");
Object.defineProperty(exports, "addManualContact", { enumerable: true, get: function () { return functions_js_1.addManualContact; } });
Object.defineProperty(exports, "discoverCompanies", { enumerable: true, get: function () { return functions_js_1.discoverCompanies; } });
Object.defineProperty(exports, "discoverDecisionMakers", { enumerable: true, get: function () { return functions_js_1.discoverDecisionMakers; } });
Object.defineProperty(exports, "exportResults", { enumerable: true, get: function () { return functions_js_1.exportResults; } });
Object.defineProperty(exports, "generateApproach", { enumerable: true, get: function () { return functions_js_1.generateApproach; } });
Object.defineProperty(exports, "generatePersona", { enumerable: true, get: function () { return functions_js_1.generatePersona; } });
Object.defineProperty(exports, "processSearch", { enumerable: true, get: function () { return functions_js_1.processSearch; } });
Object.defineProperty(exports, "recalibrateWeights", { enumerable: true, get: function () { return functions_js_1.recalibrateWeights; } });
Object.defineProperty(exports, "recordFeedback", { enumerable: true, get: function () { return functions_js_1.recordFeedback; } });
Object.defineProperty(exports, "scoreEntities", { enumerable: true, get: function () { return functions_js_1.scoreEntities; } });
