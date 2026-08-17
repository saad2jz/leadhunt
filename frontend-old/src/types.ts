export interface Contact {
  id: string;
  name: string;
  role: string;
  seniority: string;
  confidence: "high" | "medium" | "low" | "manual";
  verifiedAt: string;
  source: "api" | "manual";
  email?: string;
  linkedinUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  sector: string;
  size: number;
  geo: string;
  website: string;
  fitScore: number;
  timingScore: number;
  crmStatus: "new" | "already_in_pipe" | "excluded";
  fitBreakdown: Record<string, number>;
  timingBreakdown: Record<string, number | string>;
  contacts: Contact[];
  signals: string[];
}

