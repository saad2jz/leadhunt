export const METERED_APIS = ["hunter", "apollo", "pappers"] as const;

export type MeteredApiName = (typeof METERED_APIS)[number];

export interface ApiUsageState {
  apiName: MeteredApiName;
  month: string;
  count: number;
  limit: number;
  remaining: number;
}

export interface QuotaReservation extends ApiUsageState {
  allowed: boolean;
  cost: number;
  reset: boolean;
}

export interface ApiUsageRepository {
  reserve(
    apiName: MeteredApiName,
    month: string,
    limit: number,
    cost: number,
  ): Promise<QuotaReservation>;
  markExhausted(
    apiName: MeteredApiName,
    month: string,
    limit: number,
  ): Promise<void>;
}

