"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiQuotaService = void 0;
const config_js_1 = require("./config.js");
const month_js_1 = require("./month.js");
class ApiQuotaService {
    repository;
    now;
    env;
    constructor(repository, now = () => new Date(), env = process.env) {
        this.repository = repository;
        this.now = now;
        this.env = env;
    }
    reserve(apiName, cost = 1) {
        return this.repository.reserve(apiName, (0, month_js_1.utcMonthKey)(this.now()), (0, config_js_1.quotaLimitFor)(apiName, this.env), cost);
    }
    markProviderQuotaExhausted(apiName) {
        return this.repository.markExhausted(apiName, (0, month_js_1.utcMonthKey)(this.now()), (0, config_js_1.quotaLimitFor)(apiName, this.env));
    }
}
exports.ApiQuotaService = ApiQuotaService;
