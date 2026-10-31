import Link from 'next/link';

export const metadata = { title: "Politique d'utilisation — Courtier" };

// Put a real contact address here: it is shown in the "Supprimer vos données" section.
const CONTACT_EMAIL = '';

const sections = [
  {
    title: 'Ce que fait Courtier',
    body: [
      "Courtier est un assistant IA qui aide à analyser des plans et des documents, comparer des matériaux et des fournisseurs, estimer des coûts et comprendre les formalités d'importation de véhicules, notamment ceux de moins de 3 ans en Algérie.",
      "Les réponses sont générées par une intelligence artificielle.",
    ],
  },
  {
    title: 'Des informations indicatives',
    body: [
      "L'IA peut se tromper, être incomplète ou citer des règles dépassées. Les coûts et les taxes sont des estimations, pas des devis ni des calculs officiels.",
      "Avant d'acheter, de payer, de construire ou de déposer un dossier, vérifiez auprès des administrations compétentes (douanes, organismes d'homologation et d'enregistrement) et, pour les plans et les structures, auprès d'un architecte ou d'un ingénieur. Courtier ne fournit pas de conseil juridique, fiscal ou technique.",
    ],
  },
  {
    title: 'Responsabilité',
    body: [
      "Le service est fourni tel quel, sans garantie. Son éditeur n'est pas responsable des décisions prises ou des pertes subies à partir des réponses de l'assistant.",
    ],
  },
  {
    title: 'Avec ou sans compte',
    body: [
      "Sans compte, vous pouvez discuter avec l'assistant. La conversation n'est pas enregistrée sur nos serveurs. Les informations de votre dossier (documents analysés, notes sur le véhicule, budget, wilaya) et votre choix de modèle sont gardés dans votre navigateur.",
      "Avec un compte, nous enregistrons votre nom d'utilisateur, votre e-mail, votre avatar et vos conversations (messages et noms des fichiers joints) sur nos serveurs, pour que vous les retrouviez sur vos appareils.",
      "L'analyse de documents (JPG, PNG, WebP ou PDF) demande un compte. Les fichiers que vous envoyez pour analyse sont enregistrés sur nos serveurs.",
    ],
  },
  {
    title: "Services d'IA tiers",
    body: [
      "Pour répondre, vos messages, les informations de votre dossier et les documents que vous faites analyser sont envoyés au fournisseur du modèle d'IA que vous avez choisi (par exemple Google Gemini). Il les traite selon ses propres conditions.",
      "Si vous indiquez un serveur d'IA local dans votre profil, vos messages peuvent être envoyés à cette adresse.",
    ],
  },
  {
    title: 'Documents sensibles',
    body: [
      "Les pièces d'identité, cartes grises, factures et autres documents contiennent des données personnelles. N'envoyez que ce qui est nécessaire à l'analyse et masquez le reste quand c'est possible.",
    ],
  },
  {
    title: 'Supprimer vos données',
    body: [
      "La fonction d'effacement de l'historique supprime vos conversations, votre dossier et vos notes enregistrés dans le navigateur, ainsi que vos conversations enregistrées si vous êtes connecté.",
      CONTACT_EMAIL
        ? `Pour supprimer aussi vos fichiers envoyés ou votre compte, écrivez à ${CONTACT_EMAIL}.`
        : "Pour supprimer aussi vos fichiers envoyés ou votre compte, contactez l'éditeur du service.",
    ],
  },
  {
    title: 'Abonnement',
    body: [
      "Certaines fonctionnalités avancées peuvent être payantes. Le prix et les conditions vous sont présentés avant tout paiement.",
    ],
  },
  {
    title: 'Utilisation acceptable',
    body: [
      "Utilisez Courtier pour vos projets et vos démarches. N'essayez pas de contourner la réglementation et n'envoyez pas de contenu illégal ou abusif.",
    ],
  },
  {
    title: 'Modifications',
    body: [
      "Cette politique peut évoluer. En cas de changement important, l'acceptation vous sera demandée à nouveau.",
    ],
  },
];

export default function PolicyPage() {
  return (
    <main className="min-h-dvh bg-[#0b0b0d] px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-white sm:px-8 sm:py-10">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-amber-400 underline">
          Retour à Courtier
        </Link>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Politique d&apos;utilisation</h1>
        <p className="mt-1 text-sm text-neutral-400">Dernière mise à jour : 31 octobre 2026</p>

        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-bold">{s.title}</h2>
              <div className="mt-2 space-y-3 leading-relaxed text-neutral-300">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
