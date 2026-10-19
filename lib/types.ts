export const DOC_TYPES = [
  'facture',
  'carte_grise',
  'identite',
  'paiement',
  'cession',
  'conformite',
  'autre',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const FIELD_KEYS = [
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
  'vendeur',
  'acheteur',
  'date_document',
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const NUMERIC_FIELDS: readonly FieldKey[] = ['annee', 'cylindree_cm3', 'kilometrage', 'prix'];

export const FIELD_LABELS: Record<FieldKey, string> = {
  marque: 'Marque',
  modele: 'Modèle',
  annee: 'Année',
  date_premiere_immatriculation: '1re mise en circulation',
  cylindree_cm3: 'Cylindrée',
  carburant: 'Carburant',
  vin: 'N° de châssis (VIN)',
  kilometrage: 'Kilométrage',
  prix: 'Prix',
  devise: 'Devise',
  vendeur: 'Vendeur',
  acheteur: 'Acheteur',
  date_document: 'Date du document',
};

export type DocFields = { [K in FieldKey]?: string | number };

export type Confidence = 'haute' | 'moyenne' | 'faible';

export type Attachment = { name: string };

export type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  attachments?: Attachment[];
  error?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type AnalyzedDoc = {
  id: string;
  fileName: string;
  status: 'ok' | 'error';
  error?: string;
  type: DocType;
  confidence: Confidence;
  summary: string;
  fields: DocFields;
  issues: string[];
  addedAt: number;
};

export type AnalyzeResult = {
  fileName: string;
  ok: boolean;
  error?: string;
  type?: DocType;
  confidence?: Confidence;
  summary?: string;
  fields?: DocFields;
  issues?: string[];
};

// Mémoire du projet : informations durables que l'assistant reçoit à chaque question
export type Memory = {
  vehicule: string;
  paysAchat: string;
  budget: string;
  wilaya: string;
  notes: string;
};
