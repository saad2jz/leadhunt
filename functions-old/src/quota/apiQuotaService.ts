import { quotaLimitFor } from "./config.js";
import { utcMonthKey } from "./month.js";
import type {
  ApiUsageRepository,
  MeteredApiName,
  QuotaReservation,
} from "./types.js";

export class ApiQuotaService {
  constructor(
    private readonly repository: ApiUsageRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  reserve(apiName: MeteredApiName, cost = 1): Promise<QuotaReservation> {
    return this.repository.reserve(
      apiName,
      utcMonthKey(this.now()),
      quotaLimitFor(apiName, this.env),
      cost,
    );
  }

  markProviderQuotaExhausted(apiName: MeteredApiName): Promise<void> {
    return this.repository.markExhausted(
      apiName,
      utcMonthKey(this.now()),
      quotaLimitFor(apiName, this.env),
    );
  }
}

