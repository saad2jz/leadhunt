import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type {
  ApiUsageRepository,
  MeteredApiName,
  QuotaReservation,
} from "./types.js";

interface StoredUsage {
  month?: unknown;
  count?: unknown;
}

export class FirestoreApiUsageRepository implements ApiUsageRepository {
  constructor(private readonly db: Firestore) {}

  async reserve(
    apiName: MeteredApiName,
    month: string,
    limit: number,
    cost: number,
  ): Promise<QuotaReservation> {
    if (!Number.isSafeInteger(cost) || cost <= 0) {
      throw new Error("Le coût d'une réservation doit être un entier strictement positif");
    }

    const ref = this.db.collection("apiUsage").doc(apiName);
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const stored = (snapshot.data() ?? {}) as StoredUsage;
      const reset = stored.month !== month;
      const currentCount =
        !reset && Number.isSafeInteger(stored.count) && Number(stored.count) >= 0
          ? Number(stored.count)
          : 0;
      const allowed = currentCount + cost <= limit;
      const nextCount = allowed ? currentCount + cost : currentCount;

      transaction.set(
        ref,
        {
          apiName,
          month,
          count: nextCount,
          limit,
          remaining: Math.max(0, limit - nextCount),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );

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

  async markExhausted(
    apiName: MeteredApiName,
    month: string,
    limit: number,
  ): Promise<void> {
    const ref = this.db.collection("apiUsage").doc(apiName);
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const stored = (snapshot.data() ?? {}) as StoredUsage;
      if (stored.month !== month) return;

      transaction.set(
        ref,
        {
          apiName,
          month,
          count: limit,
          limit,
          remaining: 0,
          updatedAt: FieldValue.serverTimestamp(),
          providerQuotaObservedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
    });
  }
}

