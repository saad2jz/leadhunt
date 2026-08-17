import type { Company } from "./types";

export const demoCompanies: Company[] = [
  {
    id: "lumon", name: "Lumon Systems", sector: "SaaS RH", size: 240,
    geo: "Paris, France", website: "lumon.example", fitScore: 94, timingScore: 86,
    crmStatus: "new", signals: ["18 recrutements", "Refonte SI", "Croissance +31 %"],
    fitBreakdown: { Secteur: 1, Taille: 1, Zone: 1, "Décideur cible": 0.76 },
    timingBreakdown: { Financier: 1, Recrutement: 1, Technique: 0.75, Récence: 0.9, "Dernier signal": "8 août 2026" },
    contacts: [
      { id: "c1", name: "Claire Moreau", role: "Directrice des systèmes d’information", seniority: "C-level", confidence: "high", verifiedAt: "12 août 2026", source: "api", email: "claire@lumon.example", linkedinUrl: "https://linkedin.com" },
      { id: "c2", name: "Nicolas Rey", role: "Head of Procurement", seniority: "Head", confidence: "medium", verifiedAt: "9 août 2026", source: "api" },
    ],
  },
  {
    id: "nova", name: "Nova Industrie", sector: "Industrie 4.0", size: 780,
    geo: "Lyon, France", website: "nova.example", fitScore: 87, timingScore: 72,
    crmStatus: "already_in_pipe", signals: ["Migration cloud", "Nouveau site"],
    fitBreakdown: { Secteur: 0.9, Taille: 0.8, Zone: 1, "Décideur cible": 0.8 },
    timingBreakdown: { Financier: 0.5, Recrutement: 0.75, Technique: 1, Récence: 0.6, "Dernier signal": "24 juillet 2026" },
    contacts: [{ id: "c3", name: "Sophie Bernard", role: "CTO", seniority: "C-level", confidence: "high", verifiedAt: "11 août 2026", source: "api", email: "s.bernard@nova.example" }],
  },
  {
    id: "atlas", name: "Atlas Finance", sector: "Fintech", size: 95,
    geo: "Lille, France", website: "atlas.example", fitScore: 79, timingScore: 91,
    crmStatus: "new", signals: ["Levée Série A", "Équipe tech +40 %"],
    fitBreakdown: { Secteur: 1, Taille: 0.7, Zone: 1, "Décideur cible": 0.5 },
    timingBreakdown: { Financier: 1, Recrutement: 1, Technique: 0.65, Récence: 1, "Dernier signal": "13 août 2026" },
    contacts: [{ id: "c4", name: "Thomas Lemaire", role: "VP Engineering", seniority: "VP", confidence: "medium", verifiedAt: "7 août 2026", source: "api" }],
  },
  {
    id: "verde", name: "Verde Retail", sector: "Retail", size: 430,
    geo: "Bruxelles, Belgique", website: "verde.example", fitScore: 68, timingScore: 54,
    crmStatus: "excluded", signals: ["Nouvelle direction"],
    fitBreakdown: { Secteur: 0.5, Taille: 1, Zone: 0.6, "Décideur cible": 0.7 },
    timingBreakdown: { Financier: 0.3, Recrutement: 0.4, Technique: 0.5, Récence: 0.75, "Dernier signal": "2 août 2026" },
    contacts: [],
  },
];
