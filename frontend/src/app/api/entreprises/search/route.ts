import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getScopedPrisma } from '@/lib/auth-scope';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const dept = searchParams.get('departement');
  const page = searchParams.get('page') || '1';

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Le paramètre de recherche q doit faire au moins 2 caractères.' }, { status: 400 });
  }

  try {
    const scopedPrisma = getScopedPrisma(session);

    // Construction de l'URL d'appel de l'API Recherche d'entreprises
    let url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query.trim())}&page=${page}&per_page=10`;
    if (dept && /^\d{2,3}$/.test(dept.trim())) {
      url += `&departement=${encodeURIComponent(dept.trim())}`;
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Prospect-Intelligence/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Erreur API Sirene (${response.status}):`, await response.text());
      return NextResponse.json({ error: 'Erreur lors de la communication avec l\'API de recherche d\'entreprises.' }, { status: response.status });
    }

    const data = await response.json();

    // Mapping des résultats de l'API vers le format attendu
    const results = (data.results || []).map((ent: any) => {
      // Extraction de l'adresse du siège
      const siege = ent.siege || {};
      const adresseComplete = siege.adresse || 
        [siege.numero_voie, siege.type_voie, siege.libelle_voie, siege.code_postal, siege.libelle_commune]
          .filter(Boolean)
          .join(' ') || 'Adresse non communiquée';

      // Extraction du dirigeant principal (si disponible)
      const dirigeantPrincipal = ent.dirigeants?.[0] || {};
      const dirigeantNom = dirigeantPrincipal.nom && dirigeantPrincipal.prenom
        ? `${dirigeantPrincipal.prenom} ${dirigeantPrincipal.nom}`
        : 'Non renseigné';
      const dirigeantRole = dirigeantPrincipal.qualite || 'Dirigeant';

      return {
        nom: ent.nom_complet || ent.nom_raison_sociale || 'Entreprise inconnue',
        siren: ent.siren || '',
        formeJuridique: ent.nature_juridique || ent.categorie_juridique || 'Forme inconnue',
        adresse: adresseComplete,
        codeNaf: ent.activite_principale || siege.activite_principale || 'N/A',
        libelleSecteur: ent.libelle_activite_principale || 'Activité non spécifiée',
        dirigeantNom,
        dirigeantRole,
        trancheEffectif: ent.tranche_effectif_salarie || 'Inconnu',
      };
    });

    // Enregistrement de l'utilisation de l'API (quota)
    try {
      const today = new Date();
      const resetAt = new Date(today.getFullYear(), today.getMonth() + 1, 1); // 1er du mois suivant

      await scopedPrisma.usageAPI.create({
        data: {
          apiName: 'sirene_search',
          count: 1,
          limit: null, // Pas de limite pour SIRENE gratuite
          resetAt,
        },
      });
    } catch (dbError) {
      // On ne bloque pas la recherche si l'écriture de log échoue
      console.error('Erreur log UsageAPI:', dbError);
    }

    return NextResponse.json({
      results,
      total_results: data.total_results || results.length,
      page: Number(page),
      total_pages: data.total_pages || 1,
    });
  } catch (error) {
    console.error('Erreur recherche SIRENE:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
