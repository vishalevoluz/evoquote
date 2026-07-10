# AutoKuca Quote (Next.js)

Upload an unstructured `.xlsx` quote export (all sheets extracted) or a `.cfg`
SAP variant-configuration XML file. The app parses it into a structured,
editable CRM record and can push it to an external CRM via REST or MCP.

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind v4)
- **Supabase** — auth (email/password) + Postgres (sessions, CRM sync log)
- **SheetJS (xlsx)** — multi-sheet Excel parsing
- **fast-xml-parser** — `.cfg` (SAP variant-config XML) parsing
- CRM integration via a pluggable adapter (`src/lib/crm.ts`) — REST or MCP

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + CRM values
npm run dev
```

Open http://localhost:3000. Without Supabase env vars set, the app still
runs (auth/session persistence just no-ops) so you can try the parsing and
UI immediately.

## Supabase setup

1. Create a project at supabase.com.
2. Copy the Project URL, anon key, and service role key into `.env.local`.
3. Run `supabase/schema.sql` in the SQL editor to create the `sessions` and
   `crm_sync_log` tables (with RLS policies).
4. Email/password auth is enabled by default in Supabase — no extra config
   needed for the built-in login page at `/login`.

## CRM integration

Set `CRM_MODE` in `.env.local`:

- `rest` — the app POSTs the structured record as JSON to `CRM_API_URL`
  with a Bearer token (`CRM_API_KEY`). Adjust the payload shape in
  `src/lib/crm.ts` → `toCrmPayload()` to match your CRM's API.
- `mcp` — the app calls `CRM_MCP_ENDPOINT`, expecting a bridge/service in
  front of your MCP tool call. Replace the fetch body in `saveToCrm()` with
  whatever contract your MCP connector expects.
- unset — "no-op" mode: the save button still works and logs to
  `crm_sync_log` in Supabase, but nothing is sent externally. Useful while
  building out the rest of the app before the CRM is wired up.

## Project structure

```
src/
  app/
    page.tsx                 # main authenticated page (server component)
    login/page.tsx            # Supabase email/password auth
    api/
      parse/route.ts          # POST a file → parsed JSON (excel or cfg)
      session/route.ts        # persist session/upload metadata to Supabase
      crm/save/route.ts       # push a structured record to the CRM
      auth/signout/route.ts
  components/
    AppShell.tsx               # two-pane upload + view app
    UploadZone.tsx
    ExcelRawView.tsx            # tabbed raw sheet viewer
    StructuredQuoteView.tsx     # editable CRM record + Save to CRM
    CfgView.tsx                 # CSTICS / CONDITIONS tables + CSV export
    AuthHeader.tsx
  lib/
    parsers/excelParser.ts
    parsers/cfgParser.ts
    crm.ts                      # REST/MCP adapter
    supabase/{client,server,admin}.ts
  middleware.ts                 # Supabase session refresh + route protection
supabase/schema.sql
```

## Notes on the Excel parser

The structured parser (`src/lib/parsers/excelParser.ts`) assumes the same
"calculation sheet" layout used in STILL / SAP-variant-config quote exports:
code in column A, section headers in column B, feature/value/description in
C–E, and pricing in F/G/H/J with a condition type in K. All sheets in the
workbook are still extracted and shown raw regardless of layout — only the
"structured CRM record" view depends on this assumption. If your quote files
use a different layout, adjust the column mapping in that file.
