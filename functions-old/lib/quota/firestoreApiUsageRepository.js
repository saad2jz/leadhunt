"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreApiUsageRepository = void 0;
const firestore_1 = require("firebase-admin/firestore");
class FirestoreApiUsageRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async reserve(apiName, month, limit, cost) {
        if (!Number.isSafeInteger(cost) || cost <= 0) {
            throw new Error("Le coût d'une réservation doit être un entier strictement positif");
        }
        const ref = this.db.collection("apiUsage").doc(apiName);
        return this.db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(ref);
            const stored = (snapshot.data() ?? {});
            const reset = stored.month !== month;
            const currentCount = !reset && Number.isSafeInteger(stored.count) && Number(stored.count) >= 0
                ? Number(stored.count)
                : 0;
            const allowed = currentCount + cost <= limit;
            const nextCount = allowed ? currentCount + cost : currentCount;
            transaction.set(ref, {
                apiName,
                month,
                count: nextCount,
                limit,
                remaining: Math.max(0, limit - nextCount),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: false });
            return {
                apiName,
                month,
                count: nextCount,
                limit,
                remaining: Math.max(0, limit - nextCount),
                allowed,
                cost,
                reset,
            };
        });
    }
    async markExhausted(apiName, month, limit) {
        const ref = this.db.collection("apiUsage").doc(apiName);
        await this.db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(ref);
            const stored = (snapshot.data() ?? {});
            if (stored.month !== month)
                return;
            transaction.set(ref, {
                apiName,
                month,
                count: limit,
                limit,
                remaining: 0,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                providerQuotaObservedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: false });
        });
    }
}
exports.FirestoreApiUsageRepository = FirestoreApiUsageRepository;
