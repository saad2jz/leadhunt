"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichDecisionMakers = enrichDecisionMakers;
const errors_js_1 = require("../providers/errors.js");
async function enrichDecisionMakers(domain, dependencies) {
    const skippedForQuota = [];
    const chain = [
        ["hunter", dependencies.hunter],
        ["apollo", dependencies.apollo],
    ];
    for (const [apiName, provider] of chain) {
        const reservation = await dependencies.quota.reserve(apiName);
        if (!reservation.allowed) {
            skippedForQuota.push(apiName);
            continue;
        }
        try {
            const contacts = await provider.find(domain);
            if (contacts.length > 0) {
                return { contacts, source: apiName, skippedForQuota };
            }
        }
        catch (error) {
            if (!(error instanceof errors_js_1.ProviderQuotaError))
                throw error;
            await dependencies.quota.markProviderQuotaExhausted(apiName);
            skippedForQuota.push(apiName);
        }
    }
    return { contacts: [], source: null, skippedForQuota };
}
