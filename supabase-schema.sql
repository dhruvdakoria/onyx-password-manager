-- ============================================================
-- Onyx Password Manager — Supabase Schema
-- Run this in the Supabase SQL Editor: supabase.com → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles table (mirrors Clerk users) ────────────────────
create table if not exists public.profiles (
    id uuid primary key default uuid_generate_v4(),
    clerk_user_id text unique not null,
    email text not null,
    first_name text,
    last_name text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ── Vault config (encrypted master key per user) ─────────────
create table if not exists public.vault_config (
    clerk_user_id text primary key references public.profiles(clerk_user_id) on delete cascade,
    pin_salt text not null,
    encrypted_master_key_with_pin text not null,
    encrypted_master_key_with_recovery text,
    has_pin_setup boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ── Vault items (only encrypted ciphertext in encrypted_data) ──
create table if not exists public.vault_items (
    id uuid primary key default uuid_generate_v4(),
    clerk_user_id text not null references public.profiles(clerk_user_id) on delete cascade,
    name text not null,
    category text not null default 'other',
    is_favorite boolean default false,
    url text,
    encrypted_data text not null,  -- ciphertext of { username, password, notes }
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ── Audit log ─────────────────────────────────────────────────
create table if not exists public.audit_log (
    id uuid primary key default uuid_generate_v4(),
    clerk_user_id text not null,
    action text not null,
    ip_address inet,
    user_agent text,
    created_at timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists vault_items_user_idx on public.vault_items(clerk_user_id);
create index if not exists vault_items_name_idx on public.vault_items(clerk_user_id, name);
create index if not exists audit_log_user_idx on public.audit_log(clerk_user_id);

-- ── Row Level Security ────────────────────────────────────────
-- NOTE: RLS is a second layer of defense. Our API routes also enforce ownership.
-- Since we use service role key on the server, we don't configure JWT-based RLS.
-- Instead, RLS is disabled for service role (default Supabase behavior).
-- User data isolation is enforced in API routes via clerk_user_id filtering + Clerk session.

alter table public.profiles enable row level security;
alter table public.vault_config enable row level security;
alter table public.vault_items enable row level security;
alter table public.audit_log enable row level security;

-- Service role key bypasses RLS (used by our API routes) — this is correct.
-- No additional policies needed since service role has full access.

-- ============================================================
-- Verify tables were created:
-- ============================================================
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
