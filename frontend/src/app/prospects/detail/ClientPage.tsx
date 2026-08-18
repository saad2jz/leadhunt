'use client';


import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useSession } from 'next-auth/react';
import { getPitchForSector } from '@/lib/pitch-templates';
import { 
  Building, User, Mail, Phone, Calendar, Star, Edit3, Trash2, 
  Plus, MessageSquare, AlertTriangle, Check, Upload, ArrowLeft, X, Layers, Cpu, ExternalLink, Link2, FileText, Compass
} from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ProspectDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = searchParams.get('id') as string;

  const [prospect, setProspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // States for logging interaction
  const [interType, setInterType] = useState<'Appel' | 'Email' | 'LinkedIn' | 'RDV'>('Appel');
  const [interResult, setInterResult] = useState('Répondu');
  const [interNotes, setInterNotes] = useState('');
  const [logging, setLogging] = useState(false);

  // States for adding contact
  const [showContactForm, setShowContactForm] = useState(false);
  const [cNom, setCNom] = useState('');
  const [cFonction, setCFonction] = useState('Gérant');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cLinkedin, setCLinkedin] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [addingContact, setAddingContact] = useState(false);

  // Sales Navigator Import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  // Outreach states
  const [templates, setTemplates] = useState<any[]>([]);
  const [sequences, setSequences] = useState<any[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showSeqModal, setShowSeqModal] = useState(false);
  const [selectedSeqId, setSelectedSeqId] = useState('');
  const [subscribingSeq, setSubscribingSeq] = useState(false);

  // IA & hiring signals states
  const [analyzingIa, setAnalyzingIa] = useState<string | null>(null);
  const [checkingJobs, setCheckingJobs] = useState(false);
  const [syncingCrm, setSyncingCrm] = useState(false);

  const handleAnalyzeIA = async (interactionId: string) => {
    setAnalyzingIa(interactionId);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/ia/analyser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactionId }),
      });
      if (res.ok) {
        setMessage("Qualification IA effectuée avec succès.");
        fetchProspect();
      } else {
        setError("Erreur lors de l'analyse IA.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setAnalyzingIa(null);
    }
  };

  const handleCheckJobs = async () => {
    setCheckingJobs(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/signaux/verifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: id }),
      });
      if (res.ok) {
        setMessage("Vérification des offres d'emploi effectuée.");
        fetchProspect();
      } else {
        setError("Erreur de récupération des signaux.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setCheckingJobs(false);
    }
  };

  const handleSyncCRM = async () => {
    setSyncingCrm(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/crm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: id }),
      });
      if (res.ok) {
        setMessage("Synchronisation CRM effectuée.");
        fetchProspect();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur de synchronisation CRM.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setSyncingCrm(false);
    }
  };

  useEffect(() => {
    fetchProspect();
    fetchOutreachData();
  }, [id]);

  const fetchOutreachData = async () => {
    try {
      const [resTpl, resSeq] = await Promise.all([
        fetch('/api/settings/templates'),
        fetch('/api/settings/sequences'),
      ]);
      if (resTpl.ok && resSeq.ok) {
        const dataTpl = await resTpl.json();
        const dataSeq = await resSeq.json();
        setTemplates(dataTpl.templates || []);
        setSequences(dataSeq.sequences || []);
        if (dataSeq.sequences?.length > 0) {
          setSelectedSeqId(dataSeq.sequences[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingEmail(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/emails/envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: id,
          contactId: selectedContactId,
          objet: emailSubject,
          corps: emailBody,
        }),
      });
      if (res.ok) {
        setEmailSubject('');
        setEmailBody('');
        setShowEmailModal(false);
        setMessage("Email envoyé et loggé avec succès.");
        fetchProspect();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur d'envoi.");
      }
    } catch (err) {
      setError("Erreur réseau.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSubscribeSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribingSeq(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/prospects/inscrire-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: id,
          sequenceId: selectedSeqId,
        }),
      });
      if (res.ok) {
        setShowSeqModal(false);
        setMessage("Prospect inscrit à la séquence avec succès.");
        fetchProspect();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'inscription.");
      }
    } catch (err) {
      setError("Erreur réseau.");
    } finally {
      setSubscribingSeq(false);
    }
  };

  const handleSelectTemplate = (tplId: string) => {
    const selected = templates.find(t => t.id === tplId);
    if (selected) {
      setEmailSubject(selected.objet);
      setEmailBody(selected.corps);
    }
  };

  const fetchProspect = async () => {
    try {
      const res = await fetch(`/api/prospects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProspect(data.prospect);
      } else {
        setError("Erreur lors de la récupération du prospect.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: status }),
      });
      if (res.ok) {
        setProspect((prev: any) => ({ ...prev, statut: status }));
        setMessage("Statut mis à jour.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateNote = async (stars: number) => {
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: stars }),
      });
      if (res.ok) {
        setProspect((prev: any) => ({ ...prev, note: stars }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    setMessage('');

    // Règle d'alerte anti-doublon territorial lors du log
    if (prospect.assigneAId && prospect.assigneAId !== session?.user?.id) {
      const confirmLog = window.confirm(`Ce prospect est suivi par un autre commercial. Voulez-vous vraiment enregistrer cette interaction ?`);
      if (!confirmLog) {
        setLogging(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: id,
          type: interType,
          resultat: interResult,
          notes: interNotes,
        }),
      });

      if (res.ok) {
        setInterNotes('');
        setMessage("Interaction enregistrée avec succès.");
        fetchProspect();
      } else {
        setError("Erreur lors de l'enregistrement de l'interaction.");
      }
    } catch (err) {
      setError("Erreur réseau.");
    } finally {
      setLogging(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingContact(true);
    setError('');

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: id,
          nom: cNom,
          fonction: cFonction,
          email: cEmail || null,
          telephone: cPhone || null,
          linkedinUrl: cLinkedin || null,
          notes: cNotes || null,
        }),
      });

      if (res.ok) {
        setCNom('');
        setCEmail('');
        setCPhone('');
        setCLinkedin('');
        setCNotes('');
        setShowContactForm(false);
        setMessage("Contact ajouté avec succès.");
        fetchProspect();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur de création du contact.");
      }
    } catch (err) {
      setError("Erreur réseau.");
    } finally {
      setAddingContact(false);
    }
  };

  // Import Sales Navigator CSV (Client-side Parser)
  const handleImportSalesNav = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingCsv(true);
    setError('');
    setMessage('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n').map(l => l.split(','));
        const headers = lines[0]?.map(h => h.trim().replace(/"/g, '')) || [];

        // Identifie l'index des colonnes requises
        const idxFirstName = headers.findIndex(h => h.toLowerCase().includes('first name') || h.toLowerCase().includes('prénom'));
        const idxLastName = headers.findIndex(h => h.toLowerCase().includes('last name') || h.toLowerCase().includes('nom'));
        const idxTitle = headers.findIndex(h => h.toLowerCase().includes('title') || h.toLowerCase().includes('titre') || h.toLowerCase().includes('poste'));
        const idxCompany = headers.findIndex(h => h.toLowerCase().includes('company') || h.toLowerCase().includes('entreprise'));
        const idxProfile = headers.findIndex(h => h.toLowerCase().includes('linkedin') || h.toLowerCase().includes('profil'));

        const parsedContacts: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (!row || row.length <= 1) continue;

          const prenom = row[idxFirstName]?.replace(/"/g, '').trim() || '';
          const nom = row[idxLastName]?.replace(/"/g, '').trim() || '';
          const poste = row[idxTitle]?.replace(/"/g, '').trim() || 'Contact';
          const entreprise = row[idxCompany]?.replace(/"/g, '').trim() || prospect.nom;
          let linkedinUrl = row[idxProfile]?.replace(/"/g, '').trim() || '';

          if (linkedinUrl && !linkedinUrl.startsWith('http')) {
            linkedinUrl = `https://${linkedinUrl}`;
          }

          if (nom) {
            parsedContacts.push({ prenom, nom, poste, entreprise, linkedinUrl });
          }
        }

        if (parsedContacts.length === 0) {
          setError("Aucun contact valide trouvé dans le CSV.");
          setImportingCsv(false);
          return;
        }

        const res = await fetch('/api/contacts/import-sales-navigator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: parsedContacts }),
        });

        if (res.ok) {
          setMessage(`${parsedContacts.length} contacts LinkedIn Sales Navigator importés avec succès.`);
          fetchProspect();
        } else {
          setError("Erreur lors de la synchronisation de l'import.");
        }
      } catch (err) {
        setError("Impossible de parser le fichier Sales Navigator CSV.");
      } finally {
        setImportingCsv(false);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteProspect = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce prospect ?")) return;

    try {
      const res = await fetch(`/api/prospects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/prospects');
      } else {
        setError("Erreur lors de la suppression.");
      }
    } catch (e) {
      setError("Erreur réseau.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex bg-slate-950 text-slate-100 min-h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col justify-center items-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-2" />
          <h2 className="font-bold text-white text-lg">Prospect introuvable</h2>
          <button onClick={() => router.push('/prospects')} className="text-blue-500 hover:underline mt-4 text-xs">Retourner aux prospects</button>
        </main>
      </div>
    );
  }

  // Load Sector pitch templates
  const pitch = getPitchForSector(prospect.secteur || prospect.categorie);

  // Anti-doublon check
  const estAssigneAUnAutre = prospect.assigneAId && session?.user?.id && prospect.assigneAId !== session.user.id;

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Back link */}
          <button 
            onClick={() => router.push('/prospects')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la liste des prospects
          </button>

          {/* Warning: Anti-doublon territorial */}
          {estAssigneAUnAutre && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-950/10 text-xs text-yellow-400">
              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500 animate-bounce" />
              <div>
                <span className="font-bold">⚠️ Alerte territoriale :</span> Ce prospect est déjà assigné à un autre commercial de l'organisation. Veuillez coordonner toute action commerciale pour éviter les doublons.
              </div>
            </div>
          )}

          {/* Feedback banners */}
          {error && <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs text-red-400">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs text-emerald-400">{message}</div>}

          {/* Fiche d'en-tête */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/20 flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-white">{prospect.nom}</h1>
                
                {/* Badge Score */}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  prospect.score < 30
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : prospect.score <= 60
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  Score: {prospect.score}/100
                </span>

                {/* Badge nouvelle création */}
                {(prospect.notes?.toLowerCase().includes('veille') || prospect.notes?.toLowerCase().includes('création') || prospect.notes?.toLowerCase().includes('récente')) && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                    🆕 Nouvelle création
                  </span>
                )}

                {/* Badge recrute */}
                {prospect.signauxEmbauche?.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold animate-pulse">
                    📈 Recrute ({prospect.signauxEmbauche.length})
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => handleUpdateNote(star)}>
                      <Star className={`h-4.5 w-4.5 ${star <= prospect.note ? 'text-yellow-500 fill-current' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                {prospect.formeJuridique} • SIREN : {prospect.siren || 'Non renseigné'}
              </p>
            </div>

            {/* Actions rapides */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={prospect.statut}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="À appeler">À appeler</option>
                <option value="Appelé">Appelé</option>
                <option value="Injoignable">Injoignable</option>
                <option value="RDV pris">RDV pris</option>
                <option value="Pas intéressé">Pas intéressé</option>
                <option value="Client">Client</option>
                <option value="Ne plus contacter">Ne plus contacter (RGPD)</option>
              </select>

              {/* Synchronisation CRM */}
              <button
                type="button"
                onClick={handleSyncCRM}
                disabled={syncingCrm}
                title={prospect.idExterneCRM ? `Synchronisé (ID Externe: ${prospect.idExterneCRM})` : "Synchroniser vers HubSpot/Pipedrive"}
                className={`p-2 border rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold ${
                  prospect.idExterneCRM
                    ? 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400 hover:border-emerald-500/40'
                    : 'border-blue-500/20 bg-blue-950/10 text-blue-400 hover:border-blue-500/40'
                }`}
              >
                <Link2 className="h-4.5 w-4.5" />
                {syncingCrm ? 'Synchro...' : prospect.idExterneCRM ? 'Synchronisé' : 'Push CRM'}
              </button>

              <button
                type="button"
                onClick={handleDeleteProspect}
                className="p-2 border border-red-500/20 hover:border-red-500/50 bg-red-950/10 text-red-400 rounded-xl transition-all"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Grille principale */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Colonne 1 : Infos & Pitch */}
            <div className="md:col-span-1 space-y-6">
              {/* Infos Entreprise */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Building className="h-4.5 w-4.5 text-blue-500" />
                  Profil de l'établissement
                </h3>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Secteur</span>
                    <span className="text-slate-200">{prospect.secteur || 'Non classifié'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Catégorie NAF</span>
                    <span className="text-slate-200">{prospect.categorie || prospect.codeNaf || 'Non renseigné'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Adresse complète</span>
                    <span className="text-slate-200">{prospect.adresse || 'Non renseignée'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Effectifs</span>
                    <span className="text-slate-200">{prospect.effectif || 'Non renseigné'}</span>
                  </div>
                  {prospect.siteWeb && (
                    <div>
                      <span className="text-slate-500 block">Site Web</span>
                      <a href={prospect.siteWeb} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                        {prospect.siteWeb}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Pitch Commercial */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                    <MessageSquare className="h-4.5 w-4.5 text-blue-500" />
                    Pitch Commercial Suggéré
                  </h3>
                  <span className="text-[10px] text-slate-500">Personnalisé selon la famille : {pitch.secteur}</span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-850">
                    <span className="text-slate-500 block font-semibold mb-1">Accroche d'appel :</span>
                    <p className="text-slate-200 italic">"{pitch.accroche}"</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 font-semibold block">Arguments clés :</span>
                    <ul className="list-disc pl-4 text-slate-300 space-y-1">
                      {pitch.arguments.map((arg, idx) => (
                        <li key={idx}>{arg}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-slate-500 font-semibold block mb-1">Appel à l'action :</span>
                    <p className="text-blue-400 font-bold">{pitch.callToAction}</p>
                  </div>
                </div>
              </div>

              {/* Séquences Outreach */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-blue-500" />
                  Campagne / Séquence Active
                </h3>

                {prospect.sequences?.filter((s: any) => s.statut === 'en cours').length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-slate-500 text-xs">Ce prospect n'est inscrit dans aucune séquence active.</p>
                    <button
                      type="button"
                      onClick={() => setShowSeqModal(true)}
                      className="w-full py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 hover:text-blue-300 rounded-xl text-xs font-bold transition-all"
                    >
                      Inscrire dans une séquence
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prospect.sequences?.filter((s: any) => s.statut === 'en cours').map((ps: any) => (
                      <div key={ps.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-xs">{ps.sequence.nom}</span>
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold uppercase">
                            En cours
                          </span>
                        </div>

                        <div className="space-y-1 text-[10px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Étape actuelle :</span>
                            <span className="font-bold text-slate-200">
                              {ps.etapeActuelle} / {ps.sequence.etapes?.length || 0}
                            </span>
                          </div>
                          
                          {ps.prochainEnvoi && (
                            <div className="flex justify-between text-slate-400">
                              <span>Prochain envoi :</span>
                              <span className="font-bold text-blue-400">
                                {new Date(ps.prochainEnvoi).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Signaux d'embauche Indeed */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                    <Compass className="h-4.5 w-4.5 text-blue-500" />
                    Signaux d'embauche
                  </h3>
                  <button
                    type="button"
                    onClick={handleCheckJobs}
                    disabled={checkingJobs}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold disabled:opacity-50"
                  >
                    {checkingJobs ? 'Recherche...' : '🔍 Scanner'}
                  </button>
                </div>

                {prospect.signauxEmbauche?.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">Aucun signal d'embauche actif détecté.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {prospect.signauxEmbauche.map((sig: any) => (
                      <div key={sig.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center gap-2">
                        <div className="overflow-hidden">
                          <span className="font-semibold text-slate-200 block truncate">{sig.titrePoste}</span>
                          <span className="text-[9px] text-slate-500">Détecté le {new Date(sig.dateDetection).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {sig.urlOffre && (
                          <a href={sig.urlOffre} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white shrink-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Devis associés */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-blue-500" />
                    Devis & Factures
                  </h3>
                  <button
                    type="button"
                    onClick={() => router.push(`/prospects/detail/devis/?id=${id}`)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                  >
                    + Gérer
                  </button>
                </div>

                {!prospect.devis || prospect.devis.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">Aucun devis créé pour ce prospect.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {prospect.devis.map((dev: any) => (
                      <div key={dev.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center gap-2">
                        <div className="overflow-hidden">
                          <span className="font-semibold text-slate-200 block truncate">{dev.numero}</span>
                          <span className="text-[9px] text-slate-500 block">{dev.montantTTC} € TTC</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border shrink-0 ${
                          dev.statut === 'accepté'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : dev.statut === 'envoyé'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {dev.statut}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Colonne 2 : Contacts & Timeline */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Contacts */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                    <User className="h-4.5 w-4.5 text-blue-500" />
                    Contacts / Décideurs ({prospect.contacts.length})
                  </h3>

                  <div className="flex items-center gap-2">
                    {/* Sales Navigator Import Input Button */}
                    <label className="cursor-pointer px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Import Sales Nav
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleImportSalesNav}
                        className="hidden" 
                        disabled={importingCsv}
                      />
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => setShowContactForm(!showContactForm)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter
                    </button>
                  </div>
                </div>

                {/* Formulaire ajout contact */}
                {showContactForm && (
                  <form onSubmit={handleAddContact} className="p-4 rounded-xl bg-slate-950 border border-slate-850 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2 flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-800/80 pb-2">
                      <span>Nouveau décideur</span>
                      <button type="button" onClick={() => setShowContactForm(false)} className="text-red-400 hover:underline">Annuler</button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Nom complet</label>
                      <input
                        type="text"
                        required
                        value={cNom}
                        onChange={(e) => setCNom(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Fonction</label>
                      <input
                        type="text"
                        required
                        value={cFonction}
                        onChange={(e) => setCFonction(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Email</label>
                      <input
                        type="email"
                        value={cEmail}
                        onChange={(e) => setCEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Téléphone</label>
                      <input
                        type="text"
                        value={cPhone}
                        onChange={(e) => setCPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Lien Profil LinkedIn</label>
                      <input
                        type="url"
                        value={cLinkedin}
                        placeholder="https://www.linkedin.com/in/..."
                        onChange={(e) => setCLinkedin(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="col-span-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={addingContact}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Enregistrer le contact
                      </button>
                    </div>
                  </form>
                )}

                {/* Table contacts */}
                {prospect.contacts.length === 0 ? (
                  <div className="text-slate-500 text-xs py-2">Aucun décideur renseigné.</div>
                ) : (
                  <div className="divide-y divide-slate-800/40 text-xs">
                    {prospect.contacts.map((contact: any) => (
                      <div key={contact.id} className="py-3 flex justify-between items-center">
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{contact.nom}</span>
                          <span className="text-slate-500 block">{contact.fonction}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          {contact.email && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedContactId(contact.id);
                                setShowEmailModal(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {contact.telephone && (
                            <a href={`tel:${contact.telephone}`} className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white">
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          
                          {/* LinkedIn Search Link */}
                          <a
                            href={contact.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.nom)}%20${encodeURIComponent(prospect.nom)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-blue-500/10 text-blue-400 hover:bg-blue-500/10 transition-all flex items-center gap-1 font-semibold"
                          >
                            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            Rechercher
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Emails Envoyés (Tracking) */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Mail className="h-4.5 w-4.5 text-blue-500" />
                  Emails Envoyés & Suivi (Resend)
                </h3>

                {prospect.emailsEnvoyes?.length === 0 ? (
                  <div className="text-slate-500 text-xs py-2">Aucun email outreach envoyé.</div>
                ) : (
                  <div className="divide-y divide-slate-800/40 text-xs">
                    {prospect.emailsEnvoyes?.map((email: any) => (
                      <div key={email.id} className="py-3 flex justify-between items-center">
                        <div className="space-y-1">
                          <span className="font-bold text-white block">{email.objet}</span>
                          <span className="text-[10px] text-slate-500 block">
                            Envoyé le : {new Date(email.dateEnvoi).toLocaleString('fr-FR')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            email.statut === 'ouvert'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : email.statut === 'cliqué'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : email.statut === 'bounced'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-slate-950 text-slate-400 border-slate-850'
                          }`}>
                            {email.statut === 'ouvert' ? '✅ Ouvert' : email.statut === 'cliqué' ? '🖱️ Cliqué' : email.statut === 'bounced' ? '❌ Bounced' : '✉️ Envoyé'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactions Timeline */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-6">
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-blue-500" />
                  Historique / Timeline
                </h3>

                {/* Formulaire log interaction */}
                <form onSubmit={handleLogInteraction} className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-4">
                  <div className="text-xs font-bold text-slate-400 border-b border-slate-800/80 pb-2">
                    Nouvelle interaction rapide
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Type de canal</label>
                      <select
                        value={interType}
                        onChange={(e) => setInterType(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-905 px-3 py-1.5 text-xs text-white"
                      >
                        <option value="Appel">Appel</option>
                        <option value="Email">Email</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="RDV">RDV</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Résultat / Outcome</label>
                      <input
                        type="text"
                        required
                        value={interResult}
                        placeholder="Ex: Répondu, RDV fixé, Non intéressé..."
                        onChange={(e) => setInterResult(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-905 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Notes / Notes de compte rendu</label>
                    <textarea
                      required
                      value={interNotes}
                      placeholder="Résumez l'échange..."
                      onChange={(e) => setInterNotes(e.target.value)}
                      className="w-full h-16 rounded-lg border border-slate-800 bg-slate-905 px-3 py-1.5 text-xs text-white resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={logging}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Enregistrer l'échange
                    </button>
                  </div>
                </form>

                {/* Liste chronologique */}
                {prospect.interactions.length === 0 ? (
                  <div className="text-slate-500 text-xs py-2">Aucun échange loggé.</div>
                ) : (
                  <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6 text-xs">
                    {prospect.interactions.map((inter: any) => (
                      <div key={inter.id} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[30px] top-0.5 h-3.5 w-3.5 rounded-full border border-blue-500 bg-slate-950 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-bold text-slate-200">
                              {inter.type} • <span className="text-blue-400 font-semibold">{inter.resultat}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {inter.type === 'Appel' && inter.notes && !inter.analyseIA && (
                                <button
                                  type="button"
                                  onClick={() => handleAnalyzeIA(inter.id)}
                                  disabled={analyzingIa === inter.id}
                                  className="text-[9px] text-blue-400 hover:text-blue-300 font-bold border border-blue-500/20 bg-blue-500/5 px-1.5 py-0.5 rounded"
                                >
                                  {analyzingIa === inter.id ? 'Analyse...' : '✨ Résumer IA'}
                                </button>
                              )}
                              <span className="text-[10px] text-slate-500">
                                {new Date(inter.date).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-400 leading-relaxed italic">
                            "{inter.notes}"
                          </p>

                          {/* Analyse IA */}
                          {inter.analyseIA && (
                            <div className="mt-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-850 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
                                  <Cpu className="h-3 w-3 text-blue-500" />
                                  Qualification IA
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                  inter.analyseIA.intentionDetectee === 'Chaud'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : inter.analyseIA.intentionDetectee === 'Froid'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                }`}>
                                  🔥 {inter.analyseIA.intentionDetectee}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                                {inter.analyseIA.resume}
                              </p>
                              <div className="text-[10px] text-slate-400 bg-slate-900/40 p-1.5 rounded-lg border border-slate-850/50 leading-relaxed">
                                <span className="font-semibold text-slate-300">Action suggérée :</span> {inter.analyseIA.actionSuggeree}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* Modale d'envoi d'email */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Rédiger un email (Resend)</h3>
                <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Utiliser un modèle d'email</label>
                  <select
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    defaultValue=""
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    <option value="" disabled>Sélectionner un modèle...</option>
                    {templates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Objet du mail</label>
                  <input
                    type="text"
                    required
                    placeholder="Objet de votre prospection..."
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Message</label>
                  <textarea
                    required
                    placeholder="Votre message..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full h-40 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingEmail ? 'Envoi...' : 'Envoyer l\'email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modale d'inscription à une séquence */}
        {showSeqModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Inscrire à une séquence d'outreach</h3>
                <button onClick={() => setShowSeqModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubscribeSequence} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Séquence active</label>
                  <select
                    value={selectedSeqId}
                    onChange={(e) => setSelectedSeqId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    {sequences.map(seq => (
                      <option key={seq.id} value={seq.id}>{seq.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSeqModal(false)}
                    className="px-4 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={subscribingSeq}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {subscribingSeq ? 'Inscription...' : 'Inscrire'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
