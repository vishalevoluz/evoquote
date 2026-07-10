-- Run this in the Supabase SQL editor (or via `supabase db push`)

create extension if not exists "uuid-ossp";

-- One row per uploaded file / browser session
create table if not exists sessions (
  id uuid primary key,                 -- generated client-side (uuidv4) when a file is uploaded
  user_id uuid references auth.users(id),
  file_name text not null,
  file_type text,                      -- 'excel' | 'cfg'
  material_no text,
  grand_total numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every attempt to push a structured record to the external CRM
create table if not exists crm_sync_log (
  id bigint generated always as identity primary key,
  session_id uuid references sessions(id),
  customer_name text,
  material_no text,
  grand_total numeric,
  mode text,          -- 'rest' | 'mcp' | 'noop'
  ok boolean not null,
  message text,
  external_id text,   -- ID returned by the CRM, if any
  created_at timestamptz not null default now()
);

-- Row Level Security: users can only see their own sessions
alter table sessions enable row level security;

create policy "Users can view their own sessions"
  on sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on sessions for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Users can update their own sessions"
  on sessions for update
  using (auth.uid() = user_id);

-- crm_sync_log is written only by the server (service role key bypasses RLS),
-- so no public policies are defined here by default.
alter table crm_sync_log enable row level security;
