# Sala Logbook

PWA offline-first per iPhone pensata come logbook personale di sala: salvataggio locale immediato, coda di sincronizzazione, statistiche lato client, export CSV/JSON e blocco con PIN locale.

## Stack

- React 19 + TypeScript + Vite
- React Router
- Tailwind CSS v4
- Dexie su IndexedDB
- Zustand
- React Hook Form + Zod
- Recharts
- Supabase opzionale per sync cloud
- vite-plugin-pwa

## Avvio locale

1. Installa dipendenze:
   `pnpm install`
2. Copia `.env.example` in `.env` e compila le variabili se vuoi attivare Supabase.
3. Avvia in sviluppo:
   `pnpm dev`

Per testare da iPhone sulla stessa rete:

- usa `pnpm dev:host`
- apri l’URL locale dal telefono
- installa la PWA da Safari o, se disponibile sul tuo iPhone, da Chrome con “Aggiungi a Home”

## Variabili ambiente

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (opzionale)

Se mancano le variabili Supabase, l’app resta completamente utilizzabile in locale e la sync cloud rimane in pausa.

## Supabase

Lo schema SQL iniziale è in [supabase/schema.sql](/Users/mohamed/Desktop/logbook/supabase/schema.sql).

## Comandi

- `pnpm dev`
- `pnpm dev:host`
- `pnpm build`
- `pnpm test`
- `pnpm lint`

## Deploy su Vercel

Il progetto e' pronto per Vercel, inclusa la rewrite SPA in [vercel.json](/Users/mohamed/Desktop/logbook/vercel.json) per far funzionare correttamente route come `/new` e `/logbook/:id`.

Passi minimi:

1. Crea un repository Git e carica il progetto su GitHub.
2. Importa il repository su Vercel.
3. Verifica che Vercel rilevi `Vite`.
4. Se richiesto, usa:
   - Build Command: `pnpm build`
   - Output Directory: `dist`
5. Imposta le variabili ambiente se vuoi la sync cloud:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SENTRY_DSN` (opzionale)
6. Fai deploy e apri l'URL pubblico dal tuo iPhone.

Se non imposti Supabase, l'app funzionera' comunque ma salvera' i dati solo localmente sul dispositivo/browser.

## Note iPhone

- La PWA non richiede App Store né account sviluppatore Apple.
- Su iPhone l’installazione è manuale tramite “Aggiungi a Home”.
- Se Chrome non mostra chiaramente l’opzione di installazione, Safari resta il flusso più affidabile per la prima aggiunta alla Home.
