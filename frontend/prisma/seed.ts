import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Charge les variables d'environnement
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('La variable d\'environnement DATABASE_URL est manquante pour le seeding.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Début du seeding des plans tarifaires...');

  const plans = [
    {
      nom: 'starter',
      modulesInclus: [
        'sirene', 
        'pipeline', 
        'dashboard', 
        'liste_noire'
      ],
      quotaEnrichissementMensuel: null,
      clesAPIPersonnelles: false,
      prixMensuel: 0.0,
    },
    {
      nom: 'pro',
      modulesInclus: [
        'sirene',
        'pipeline',
        'dashboard',
        'liste_noire',
        'recherche_intelligente',
        'veille_commerciale',
        'sequences_email',
        'crm_externe',
        'carte_geo',
        'scoring_auto',
      ],
      quotaEnrichissementMensuel: 100,
      clesAPIPersonnelles: false,
      prixMensuel: 49.0,
    },
    {
      nom: 'business',
      modulesInclus: [
        'sirene',
        'pipeline',
        'dashboard',
        'liste_noire',
        'recherche_intelligente',
        'veille_commerciale',
        'sequences_email',
        'crm_externe',
        'carte_geo',
        'scoring_auto',
        'enrichissement_waterfall',
        'telephonie',
        'delivrabilite',
        'chatbot_ia_public',
        'whatsapp',
        'intake_leads',
        'devis',
      ],
      quotaEnrichissementMensuel: 500,
      clesAPIPersonnelles: false,
      prixMensuel: 149.0,
    },
    {
      nom: 'entreprise',
      modulesInclus: [
        'sirene',
        'pipeline',
        'dashboard',
        'liste_noire',
        'recherche_intelligente',
        'veille_commerciale',
        'sequences_email',
        'crm_externe',
        'carte_geo',
        'scoring_auto',
        'enrichissement_waterfall',
        'telephonie',
        'delivrabilite',
        'chatbot_ia_public',
        'whatsapp',
        'intake_leads',
        'devis',
        'SSO',
        'roles_avances',
        'marketplace_templates',
        'app_mobile',
        'cles_perso',
      ],
      quotaEnrichissementMensuel: null,
      clesAPIPersonnelles: true,
      prixMensuel: 499.0,
    },
  ];

  for (const plan of plans) {
    await prisma.planTarifaire.upsert({
      where: { nom: plan.nom },
      update: {
        modulesInclus: plan.modulesInclus,
        quotaEnrichissementMensuel: plan.quotaEnrichissementMensuel,
        clesAPIPersonnelles: plan.clesAPIPersonnelles,
        prixMensuel: plan.prixMensuel,
      },
      create: {
        nom: plan.nom,
        modulesInclus: plan.modulesInclus,
        quotaEnrichissementMensuel: plan.quotaEnrichissementMensuel,
        clesAPIPersonnelles: plan.clesAPIPersonnelles,
        prixMensuel: plan.prixMensuel,
      },
    });
    console.log(`Plan ${plan.nom} créé ou mis à jour.`);
  }

  console.log('Seeding terminé avec succès.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
