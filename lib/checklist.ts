import type { AnalyzedDoc, DocFields, DocType, Memory } from './types';

// Règles du dispositif utilisées pour les contrôles automatiques.
// À valider régulièrement avec les textes officiels (loi de finances, douanes).
export const RULES = {
  maxCylindreeCm3: 1800,
  maxAgeYears: 3,
} as const;

export const DOC_LABELS: Record<DocType, string> = {
  facture: "Facture d'achat",
  carte_grise: 'Carte grise étrangère',
  identite: "Pièce d'identité",
  paiement: 'Justificatif de paiement',
  cession: 'Certificat de cession / non-gage',
  conformite: 'Certificat de conformité / contrôle technique',
  autre: 'Autre document',
};

export type ChecklistItem = { type: DocType; label: string; hint: string; required: boolean };

// Liste indicative : à confirmer auprès des douanes et de l'organisme compétent.
export const CHECKLIST: ChecklistItem[] = [
  { type: 'facture', label: DOC_LABELS.facture, hint: 'Avec le numéro de châssis, le prix et les coordonnées du vendeur.', required: true },
  { type: 'carte_grise', label: DOC_LABELS.carte_grise, hint: "Certificat d'immatriculation du pays d'achat.", required: true },
  { type: 'identite', label: DOC_LABELS.identite, hint: "Passeport ou carte d'identité de l'importateur.", required: true },
  { type: 'paiement', label: DOC_LABELS.paiement, hint: 'Virement ou reçu qui prouve le paiement du véhicule.', required: true },
  { type: 'cession', label: DOC_LABELS.cession, hint: 'Atteste le transfert de propriété et l’absence de gage.', required: true },
  { type: 'conformite', label: DOC_LABELS.conformite, hint: 'Recommandé pour appuyer le dossier.', required: false },
];

const PRIORITY: DocType[] = ['carte_grise', 'facture', 'conformite', 'cession', 'paiement', 'identite', 'autre'];
const VEHICLE_KEYS = [
  'marque',
  'modele',
  'annee',
  'date_premiere_immatriculation',
  'cylindree_cm3',
  'carburant',
  'vin',
  'kilometrage',
  'prix',
  'devise',
] as const;

export type Alert = { level: 'error' | 'warn'; text: string };

export type Evaluation = {
  items: (ChecklistItem & { found: AnalyzedDoc[] })[];
  missing: ChecklistItem[];
  score: number;
  vehicle: DocFields;
  alerts: Alert[];
  complete: boolean;
};

export function consolidateVehicle(docs: AnalyzedDoc[]): DocFields {
  const sorted = [...docs].sort((a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type));
  const out: Record<string, string | number> = {};
  for (const key of VEHICLE_KEYS) {
    for (const d of sorted) {
      const v = d.fields[key];
      if (v !== undefined && v !== null && v !== '') {
        out[key] = v;
        break;
      }
    }
  }
  return out as DocFields;
}

function vehicleAge(v: DocFields, now: Date): { years: number; exact: boolean } | null {
  if (typeof v.date_premiere_immatriculation === 'string') {
    const d = new Date(v.date_premiere_immatriculation);
    if (!Number.isNaN(d.getTime())) {
      return { years: (now.getTime() - d.getTime()) / (365.25 * 86_400_000), exact: true };
    }
  }
  if (typeof v.annee === 'number') return { years: now.getFullYear() - v.annee, exact: false };
  return null;
}

export function evaluateDossier(docs: AnalyzedDoc[], now: Date = new Date()): Evaluation {
  const ok = docs.filter((d) => d.status === 'ok');
  const items = CHECKLIST.map((item) => ({ ...item, found: ok.filter((d) => d.type === item.type) }));
  const required = items.filter((i) => i.required);
  const missing = required.filter((i) => i.found.length === 0);
  const score = required.length ? Math.round(((required.length - missing.length) / required.length) * 100) : 0;

  const vehicle = consolidateVehicle(ok);
  const alerts: Alert[] = [];

  if (typeof vehicle.carburant === 'string' && vehicle.carburant.toLowerCase().includes('diesel')) {
    alerts.push({ level: 'error', text: 'Véhicule diesel : interdit à l’importation dans ce dispositif.' });
  }
  if (typeof vehicle.cylindree_cm3 === 'number' && vehicle.cylindree_cm3 > RULES.maxCylindreeCm3) {
    alerts.push({
      level: 'error',
      text: `Cylindrée de ${vehicle.cylindree_cm3} cm³ : supérieure à la limite de ${RULES.maxCylindreeCm3} cm³.`,
    });
  }
  const age = vehicleAge(vehicle, now);
  if (age) {
    if (age.years > RULES.maxAgeYears) {
      alerts.push({ level: 'error', text: `Véhicule de plus de ${RULES.maxAgeYears} ans : hors dispositif.` });
    } else if (age.exact && age.years > RULES.maxAgeYears - 0.25) {
      alerts.push({ level: 'warn', text: 'Le véhicule approche les 3 ans : dépêche-toi de finaliser le dossier.' });
    } else if (!age.exact && age.years === RULES.maxAgeYears) {
      alerts.push({ level: 'warn', text: "Année d'il y a 3 ans : vérifie la date exacte de première mise en circulation." });
    }
  }

  const vins = new Set(
    ok
      .map((d) => d.fields.vin)
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .map((v) => v.replace(/\s+/g, '').toUpperCase())
  );
  if (vins.size > 1) {
    alerts.push({ level: 'error', text: 'Les numéros de châssis diffèrent entre les documents. Vérifie chaque pièce.' });
  }

  for (const d of ok) {
    for (const issue of d.issues) alerts.push({ level: 'warn', text: `${DOC_LABELS[d.type]} : ${issue}` });
    if (d.confidence === 'faible') {
      alerts.push({ level: 'warn', text: `${d.fileName} : lecture peu fiable, envoie une photo plus nette.` });
    }
  }

  const hasError = alerts.some((a) => a.level === 'error');
  alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1));
  return { items, missing, score, vehicle, alerts, complete: missing.length === 0 && !hasError };
}

export function summarizeAnalysis(created: AnalyzedDoc[], ev: Evaluation): string {
  const lines = created.map((d) =>
    d.status === 'ok'
      ? `- **${DOC_LABELS[d.type]}** (${d.fileName}) : ${d.summary}`
      : `- **${d.fileName}** : analyse impossible (${d.error ?? 'erreur inconnue'}).`
  );
  const parts = ['J’ai analysé vos documents :', '', ...lines, ''];
  parts.push(
    ev.missing.length
      ? `**Pièces requises manquantes :** ${ev.missing.map((m) => m.label).join(', ')}.`
      : 'Toutes les pièces requises sont présentes.'
  );
  const errors = ev.alerts.filter((a) => a.level === 'error');
  if (errors.length) parts.push('', '**Points bloquants :**', ...errors.map((a) => `- ${a.text}`));
  const warns = ev.alerts.filter((a) => a.level === 'warn');
  if (warns.length) parts.push('', '**À vérifier :**', ...warns.slice(0, 5).map((a) => `- ${a.text}`));
  parts.push('', `Complétude du dossier : ${ev.score} %. Le détail est dans le panneau Dossier.`);
  return parts.join('\n');
}

// Contexte envoyé à l'assistant : mémoire du projet + état du dossier
export function buildContext(memory: Memory, docs: AnalyzedDoc[]): string {
  const lines: string[] = [];
  if (memory.vehicule) lines.push(`Véhicule visé : ${memory.vehicule}`);
  if (memory.paysAchat) lines.push(`Pays d'achat : ${memory.paysAchat}`);
  if (memory.budget) lines.push(`Budget : ${memory.budget}`);
  if (memory.wilaya) lines.push(`Wilaya : ${memory.wilaya}`);
  if (memory.notes) lines.push(`Notes de l'utilisateur : ${memory.notes}`);

  if (docs.length) {
    const ev = evaluateDossier(docs);
    const v = ev.vehicle;
    const detected = [v.marque, v.modele, v.annee, v.carburant, v.cylindree_cm3 ? `${v.cylindree_cm3} cm³` : null]
      .filter(Boolean)
      .join(' ');
    if (detected) lines.push(`Véhicule détecté dans les documents : ${detected}`);
    const received = ev.items.filter((i) => i.found.length).map((i) => i.label);
    lines.push(`Documents reçus : ${received.length ? received.join(', ') : 'aucun exploitable'}`);
    lines.push(`Pièces requises manquantes : ${ev.missing.length ? ev.missing.map((m) => m.label).join(', ') : 'aucune'}`);
    if (ev.alerts.length) lines.push(`Alertes : ${ev.alerts.map((a) => a.text).join(' | ')}`);
    lines.push(`Complétude : ${ev.score} %`);
  }
  return lines.join('\n').slice(0, 3500);
}
