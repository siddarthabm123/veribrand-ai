-- Run once in the Supabase SQL Editor for a new VeriBrand workspace.
-- Re-running is safe for the current schema. The server uses a secret key;
-- browser-facing publishable keys receive no table policies and remain blocked.

create extension if not exists vector;

create table if not exists public.brand_guidelines (
  section_code text primary key,
  title text,
  category text,
  content text,
  embedding vector(1536)
);

create table if not exists public.approved_facts (
  fact_key text primary key,
  claim_statement text,
  exact_value text,
  source_doc text
);

create table if not exists public.brand_rules (
  id bigint generated always as identity primary key,
  banned_terms jsonb,
  preferred_terms jsonb,
  approved_hex_colors text[],
  min_wcag_ratio numeric
);

create table if not exists public.submissions (
  id text primary key,
  title text,
  content_type text,
  body_text text,
  image_meta jsonb,
  status text check (status in ('draft', 'audited', 'changes_requested', 'approved')),
  author_name text,
  reviewer_name text,
  created_at timestamptz default now()
);

create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  submission_id text references public.submissions(id),
  category text,
  severity text,
  exact_span text,
  start_index int,
  end_index int,
  rule_citation text,
  source_excerpt text,
  explanation text,
  suggested_fix text,
  intent_preservation_score int,
  reviewer_status text default 'pending',
  override_reason text
);

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id text references public.submissions(id),
  author_name text,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.revision_history (
  id uuid primary key default gen_random_uuid(),
  submission_id text references public.submissions(id),
  actor text,
  action text,
  created_at timestamptz default now()
);

create index if not exists audit_findings_submission_idx on public.audit_findings(submission_id);
create index if not exists review_comments_submission_idx on public.review_comments(submission_id);
create index if not exists revision_history_submission_idx on public.revision_history(submission_id);

alter table public.brand_guidelines enable row level security;
alter table public.approved_facts enable row level security;
alter table public.brand_rules enable row level security;
alter table public.submissions enable row level security;
alter table public.audit_findings enable row level security;
alter table public.review_comments enable row level security;
alter table public.revision_history enable row level security;
