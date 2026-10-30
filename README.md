# Courtier

**An AI assistant that checks vehicle import documents and guides people through customs and registration in Algeria.**

- **Live demo:** https://courtier-eta.vercel.app
- **Demo video:** https://drive.google.com/file/d/1YjJJqmECHq_nFvK1eem6Yj8gc_L6ll3P/view?usp=sharing
- **Repository:** https://github.com/Alpachino13/assistant-import-auto
- Built for the Thirduni Cohort 1 team project (October 2026).

## The problem

Importing a vehicle into Algeria means dealing with customs rules, duties and a long list of documents. One missing or incorrect paper can delay or block the whole import, and most importers depend on word of mouth or an agent they have to trust blindly.

## What Courtier does

- **Chat about the import process** in French or English: eligibility rules, duties and taxes, procedures with customs, registration. Answers stream in real time.
- **Analyse your documents.** Upload a foreign registration, invoice, certificate of conformity and similar papers (PDF, JPG, PNG or WebP, up to 8 MB, up to 6 files at a time). Courtier identifies each document, extracts key fields, summarises it and flags problems.
- **Dossier checklist and score.** The "Dossier" panel shows which documents are present, which are missing and what to do next. One click asks the assistant to review the whole dossier.
- **Vehicle context.** You can store basic details (vehicle, country of purchase, budget, wilaya, notes) that are passed to the assistant with every question.
- **No account needed to chat.** Guests can chat freely. Creating an account (email + password) saves your conversation history across devices and unlocks document analysis.

## How it works

```
Browser (Next.js app)
  ├── /api/chat     → streams answers from Google Gemini (cloud) or a local Ollama model
  ├── /api/analyze  → sends uploaded documents to Gemini to classify them and extract fields
  └── Convex        → database, email/password auth, file storage
                      (every conversation, message and file belongs to one user,
                       and the server checks ownership on every request)
```

## Run it locally

**Requirements:** Node.js 20 or later, a free [Convex](https://convex.dev) account, and a [Google Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/Alpachino13/assistant-import-auto.git
cd assistant-import-auto
npm install

# 1. Create your own Convex dev deployment (keep this running in its own terminal).
#    It writes NEXT_PUBLIC_CONVEX_URL and CONVEX_DEPLOYMENT to .env.local.
npx convex dev

# 2. In a second terminal, set up login keys on that deployment (one time).
npx @convex-dev/auth

# 3. Add your Gemini key to .env.local
echo "GEMINI_API_KEY=your-key-here" >> .env.local

# 4. Start the app
npm run dev
```

Open http://localhost:3000. You can chat straight away; sign up to try document analysis.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` / Vercel | URL of your Convex deployment (set by `npx convex dev`) |
| `CONVEX_DEPLOYMENT` | `.env.local` | Convex deployment name (set by `npx convex dev`) |
| `GEMINI_API_KEY` | `.env.local` / Vercel | Google Gemini API key used by the chat and analysis routes |
| `LOCAL_AI_URL` | `.env.local` (optional) | Address of an Ollama server, only for the local model option |
| `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` | Convex dashboard | Login keys and site address, set by `npx @convex-dev/auth` |

No secrets are committed to this repository. `.env.local` is git-ignored.

### Optional: local model

The app can also use a Qwen 2.5 (3B) model served by [Ollama](https://ollama.com) on your own machine:

```bash
ollama pull qwen2.5:3b
# then set LOCAL_AI_URL=http://localhost:11434 in .env.local and pick the local model in the app
```

This option only works when the app can reach your Ollama server, so it is not available on the hosted demo.

## Project structure

```
app/
  api/chat/route.ts       Chat endpoint (Gemini or Ollama, streamed)
  api/analyze/route.ts    Document analysis endpoint
  layout.tsx, page.tsx    App shell entry
components/
  AppShell.tsx            State, guest vs signed-in logic, sync with Convex
  ChatPanel.tsx           Chat UI and welcome screen
  Sidebar.tsx             Conversation history
  DossierPanel.tsx        Documents, checklist and score
  ProfileModal.tsx        Sign in / sign up / profile
  ConvexClientProvider.tsx
convex/
  schema.ts               Tables: users, conversations, messages, files, dossierDocs
  auth.ts, auth.config.ts, http.ts   Email + password login (Convex Auth)
  chat.ts, files.ts, dossier.ts, users.ts   Backend functions, all scoped to the signed-in user
lib/
  checklist.ts            Dossier evaluation and context building
  models.ts               Available models
  storage.ts, types.ts, convexSync.ts
```

## Team

| Name | What they did |
|---|---|
| Zakaria Mehdi Merabet ([@Alpachino13](https://github.com/Alpachino13)) | [ "Built the full stack one man team"] |

## Tech stack

- **Frontend:** Next.js 16, React, TypeScript, Tailwind CSS, Phosphor icons
- **Backend and data:** Convex (database, file storage, email/password auth with `@convex-dev/auth`)
- **AI:** Google Gemini API (chat and document analysis), Qwen 2.5 3B through Ollama (optional local model)
- **Hosting:** Vercel (app), Convex Cloud (backend), a self-hosted server reached over Tailscale (local model)
- **AI tools used while building:** Claude (code assistance and debugging)

## Known limitations

We prefer to be clear about what is not finished:

- Customs and duty answers are generated by the language model. They are not yet checked against an official tariff table and are not legal advice.
- The list of analysed documents is stored in the browser, not yet in the user's account, so it does not follow them to another device. Conversations and uploaded files are stored in the account.
- The local Qwen model only works when the app can reach the Ollama server, so it is disabled on the hosted demo.
- The chat and analysis endpoints do not require a login yet, so usage is limited only by the API key quota.
- Document analysis can take 15 to 20 seconds for several files.

## What's next

- Validate duty and tax calculations against official customs tariffs with a customs agent, then show the calculation step by step.
- Pilot Courtier with real importers and agents in Algeria and fix what they struggle with.
- Add an Arabic interface.
- Save the dossier in the user's account so it syncs across devices.
- Add rate limiting and per-user quotas on the AI endpoints.

## Disclaimer

Courtier is an assistant, not a customs authority. Always confirm requirements with the Algerian customs administration or a licensed agent before importing.
