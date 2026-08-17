import type {
  ApiUsageRepository,
  ApiUsageState,
  MeteredApiName,
  QuotaReservation,
} from "../quota/types.js";

export class InMemoryApiUsageRepository implements ApiUsageRepository {
  readonly states = new Map<MeteredApiName, ApiUsageState>();

  async reserve(
    apiName: MeteredApiName,
    month: string,
    limit: number,
    cost: number,
  ): Promise<QuotaReservation> {
    const previous = this.states.get(apiName);
    const reset = previous?.month !== month;
    const count = reset ? 0 : previous.count;
    const allowed = count + cost <= limit;
    const nextCount = allowed ? count + cost : count;
    const state = {
      apiName,
      month,
      count: nextCount,
      limit,
      remaining: Math.max(0, limit - nextCount),
    };
    this.states.set(apiName, state);
    return { ...state, allowed, cost, reset };
  }

  async markExhausted(
    apiName: MeteredApiName,
    month: string,
    limit: number,
  ): Promise<void> {
    this.states.set(apiName, {
      apiName,
      month,
      count: limit,
      limit,
      remaining: 0,
    });
  }
}

