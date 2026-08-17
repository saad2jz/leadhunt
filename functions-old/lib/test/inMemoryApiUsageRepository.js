"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryApiUsageRepository = void 0;
class InMemoryApiUsageRepository {
    states = new Map();
    async reserve(apiName, month, limit, cost) {
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
    async markExhausted(apiName, month, limit) {
        this.states.set(apiName, {
            apiName,
            month,
            count: limit,
            limit,
            remaining: 0,
        });
    }
}
exports.InMemoryApiUsageRepository = InMemoryApiUsageRepository;
