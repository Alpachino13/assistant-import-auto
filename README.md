# Assistant Import Auto 🚗🇩🇿

**Un assistant IA pour guider les Algériens dans l'importation de véhicules de moins de 3 ans et éviter les frais d'intermédiaires.**

## 🎯 Le problème et la vision

L'importation de véhicules (notamment des marques chinoises très demandées) est redevenue possible via le dispositif des moins de 3 ans. Cependant, les intermédiaires prennent des commissions très élevées qui annulent l'avantage du prix d'achat.

**La solution :** une plateforme dotée d'un assistant IA expert en réglementation douanière algérienne. Il informe et accompagne l'utilisateur pas à pas (ANIV, cylindrée, dédouanement) pour qu'il réalise ses démarches seul, de manière transparente et gratuite.

> ⚠️ Les règles intégrées au prompt (carburant, cylindrée, durée de non-revente) doivent être vérifiées régulièrement par rapport aux textes officiels en vigueur (loi de finances, circulaires des douanes).

## 🔗 Liens du projet (soumission Thirduni)

- **Démo en ligne :** [à ajouter]
- **Vidéo de démonstration :** [à ajouter]

## 🛠️ Stack technique

- **Framework :** Next.js (App Router), React
- **Style :** Tailwind CSS v4 + `@tailwindcss/typography`
- **IA :** Google Gemini API via `@google/generative-ai` (modèle par défaut : `gemini-3.5-flash`)

## 💻 Lancer le projet en local

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/votre-pseudo/assistant-import-auto.git
   cd assistant-import-auto
   ```
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Créer le fichier `.env.local` à la racine (voir `.env.example`) avec une clé obtenue sur [Google AI Studio](https://aistudio.google.com/apikey) :
   ```
   GEMINI_API_KEY=ta_cle_ici
   ```
   Ne commit jamais ce fichier (déjà ignoré par `.gitignore`).
4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```
5. Ouvrir [http://localhost:3000](http://localhost:3000).

## 🔧 Changer ou ajouter un modèle

Les modèles autorisés sont listés dans `ALLOWED_MODELS` (`app/api/chat/route.ts`). Pour voir ceux disponibles avec ta clé :

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

Ajoute ensuite le nom dans `ALLOWED_MODELS` et une `<option>` dans `app/page.tsx`.

## 🚀 Déploiement

Sur Vercel ou Cloudflare, ajoute la variable d'environnement `GEMINI_API_KEY` dans les réglages du projet.