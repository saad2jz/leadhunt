"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichCompany = enrichCompany;
const errors_js_1 = require("../providers/errors.js");
async function enrichCompany(sirenOrName, dependencies) {
    // Sirene est la source gratuite et reste toujours la base du résultat.
    const company = await dependencies.sirene.find(sirenOrName);
    const reservation = await dependencies.quota.reserve("pappers");
    if (!reservation.allowed) {
        return { company, pappers: null, pappersSkippedForQuota: true };
    }
    try {
        const pappers = await dependencies.pappers.enrich(company.siren);
        return { company, pappers, pappersSkippedForQuota: false };
    }
    catch (error) {
        if (!(error instanceof errors_js_1.ProviderQuotaError))
            throw error;
        await dependencies.quota.markProviderQuotaExhausted("pappers");
        return { company, pappers: null, pappersSkippedForQuota: true };
    }
}
