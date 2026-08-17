export interface DecisionMaker {
  name: string;
  role: string;
  email?: string;
  linkedinUrl?: string;
}

export interface CompanyIdentity {
  siren: string;
  name: string;
  sector?: string;
  size?: number;
}

export interface PappersEnrichment {
  directors?: Array<{ name: string; role: string }>;
  financials?: Record<string, unknown>;
}

