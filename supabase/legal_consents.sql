-- Consent record written by api/register.js after a live account is created.
--
-- Run this once in the Supabase SQL editor.

create table if not exists public.legal_consents (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  -- Who accepted
  full_name             text not null,
  email                 text not null,
  identification_number text,
  country               text,

  -- Where from
  ip_address            text,
  user_agent            text,

  -- The Skale CRM account the acceptance belongs to
  crm_account_id        text,

  -- What was accepted: an array of {title, version, url, accepted}, stamped
  -- with the version that was live at the moment of acceptance so a later
  -- document revision cannot rewrite history.
  documents             jsonb not null
);

create index if not exists legal_consents_email_idx
  on public.legal_consents (email);

create index if not exists legal_consents_created_at_idx
  on public.legal_consents (created_at desc);

create index if not exists legal_consents_crm_account_id_idx
  on public.legal_consents (crm_account_id);

-- This table is an audit record: it should never be readable or writable with
-- the anon/public key. Enabling RLS without adding any policy denies every
-- request made with those keys. The API writes with the service role key,
-- which bypasses RLS by design, so inserts keep working.
alter table public.legal_consents enable row level security;

comment on table public.legal_consents is
  'Immutable record of legal documents accepted at live registration. Written server-side by api/register.js using the service role key.';
