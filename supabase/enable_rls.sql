-- Apply this once to an existing VeriBrand Supabase project.
-- No policies are added: browser publishable/anon keys cannot read or write tables.
-- Server routes use SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
alter table public.brand_guidelines enable row level security;
alter table public.approved_facts enable row level security;
alter table public.brand_rules enable row level security;
alter table public.submissions enable row level security;
alter table public.audit_findings enable row level security;
alter table public.review_comments enable row level security;
alter table public.revision_history enable row level security;
