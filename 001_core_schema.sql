-- =====================================================================
-- منصة توصيل تجار الجملة — Core schema (Phase 1: roles + verification + audit)
-- Run this in a NEW, independent Supabase project (SQL Editor).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ROLES
-- The 8 platform roles. Kept as a lookup table (not an enum) so new
-- roles can be added later without a migration that rewrites a type.
-- ---------------------------------------------------------------------
create table public.roles (
  id text primary key,           -- stable slug, e.g. 'site_manager'
  name_ar text not null,
  description_ar text
);

insert into public.roles (id, name_ar, description_ar) values
  ('site_manager',        'مدير الموقع',        'اعتماد نهائي، إدارة الحسابات، إدارة عمليات المنصة'),
  ('financial_supervisor','مشرف مالي',           'تحصيل، موافقات مبدئية، محاسبة المنصة'),
  ('logistics_supervisor','مشرف لوجستي',         'تنسيق الخدمات، حل المشكلات اللوجستية'),
  ('customer_support',    'خدمة عملاء',          'استفسارات وتصعيد الشكاوى'),
  ('trader',              'تاجر',                'إدارة متجر ومنتجات ومخزون'),
  ('business_customer',   'عميل مؤسسة',          'شراء بالجملة، آجل، نقاط ولاء'),
  ('individual_customer', 'عميل فردي',           'شراء عادي بلا اعتماد مسبق'),
  ('driver',              'سائق',                'تنفيذ التوصيل');

-- ---------------------------------------------------------------------
-- 2. PROFILES
-- One row per auth.users entry. Minimal shared fields; role-specific
-- detail (trader docs, business docs, driver vehicle...) lives in later
-- migrations as separate tables keyed on user_id.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text unique,
  city text,
  status text not null default 'active' check (status in ('active','suspended','pending')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. USER_ROLES
-- Many-to-many: a single account could hold more than one role later
-- (e.g. a trader who is also an individual customer).
-- ---------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.roles(id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id),
  primary key (user_id, role_id)
);

-- Helper: does the current user hold a given role? Used throughout RLS.
create or replace function public.has_role(role_slug text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role_id = role_slug
  );
$$;

-- ---------------------------------------------------------------------
-- 4. VERIFICATION_REQUESTS
-- Onboarding/approval pipeline for traders, business customers, drivers.
-- Individual customers never appear here (phone OTP only, no approval).
-- ---------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  applicant_type text not null check (applicant_type in ('trader','business_customer','driver')),
  documents jsonb not null default '[]',   -- [{ "label": "سجل تجاري", "url": "..." }, ...]
  stage text not null default 'submitted'
    check (stage in ('submitted','logistics_review','final_review','approved','rejected')),
  reviewed_by uuid references public.profiles(id),   -- logistics supervisor who nominated it
  approved_by uuid references public.profiles(id),   -- site manager who gave final decision
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ---------------------------------------------------------------------
-- 5. AUDIT_LOG
-- Append-only record of sensitive approval/administrative actions.
-- ---------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.verification_requests enable row level security;
alter table public.audit_log enable row level security;

-- ---- profiles -------------------------------------------------------
create policy "profiles: self read" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: staff read all" on public.profiles
  for select using (
    public.has_role('site_manager') or
    public.has_role('financial_supervisor') or
    public.has_role('logistics_supervisor') or
    public.has_role('customer_support')
  );

create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid());

create policy "profiles: site manager manages all" on public.profiles
  for all using (public.has_role('site_manager'));

-- ---- user_roles -------------------------------------------------------
create policy "user_roles: self read" on public.user_roles
  for select using (user_id = auth.uid());

create policy "user_roles: staff read all" on public.user_roles
  for select using (
    public.has_role('site_manager') or
    public.has_role('logistics_supervisor') or
    public.has_role('financial_supervisor')
  );

-- Only the site manager assigns/revokes roles (final authority per spec)
create policy "user_roles: site manager writes" on public.user_roles
  for all using (public.has_role('site_manager'));

-- ---- verification_requests --------------------------------------------
create policy "verification: applicant reads own" on public.verification_requests
  for select using (applicant_id = auth.uid());

create policy "verification: applicant submits own" on public.verification_requests
  for insert with check (applicant_id = auth.uid());

create policy "verification: logistics reviews" on public.verification_requests
  for select using (public.has_role('logistics_supervisor'));

create policy "verification: logistics advances stage" on public.verification_requests
  for update using (public.has_role('logistics_supervisor'))
  with check (stage in ('logistics_review','final_review'));

create policy "verification: site manager final decision" on public.verification_requests
  for all using (public.has_role('site_manager'));

-- ---- audit_log ----------------------------------------------------------
-- Insert-only from server-side (service role / triggers), never direct
-- client insert. Read limited to site manager; financial and logistics
-- supervisors can read entries relevant to their own actions.
create policy "audit: site manager reads all" on public.audit_log
  for select using (public.has_role('site_manager'));

create policy "audit: staff reads own actions" on public.audit_log
  for select using (actor_id = auth.uid());

-- No insert/update/delete policies for regular roles: writes happen via
-- a security-definer function (see 002_audit_helpers.sql, next step)
-- so the app code never inserts into audit_log directly.

-- =====================================================================
-- Notes for next migration:
--   002 — trader/business_customer/driver detail tables + their own RLS
--   003 — products, stores, inventory
--   004 — orders, order_items, invoices (unified billing)
-- =====================================================================
