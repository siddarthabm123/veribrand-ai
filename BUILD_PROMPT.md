# VeriBrand AI — Round 2 Full-Stack Build Specification (Team ArticXCoders)

Build "VeriBrand AI" by Team ArticXCoders for CodeZen India 2026 Round 2 ("The Build" — Inkloom AI Intelligent Brand-Governance Platform).

CRITICAL REQUIREMENT FOR JUDGES: Judges will open our deployed Vercel link and test core features WITHOUT assistance and WITHOUT creating accounts or configuring API keys first. Therefore, the app MUST load immediately with a pre-seeded "Acme Cloud" demo workspace, an interactive Role Switcher (`Content Creator`, `Brand Reviewer`, `Brand Admin`), and a hybrid storage layer (`src/lib/repository.ts`) that uses Supabase when env vars are provided and seamlessly uses a stateful in-memory store when env vars are absent.

Build the complete, working Next.js App Router (TypeScript + Tailwind CSS + Lucide Icons) application cleanly across these modules:

1. `src/types/governance.ts` & `supabase/schema.sql`:
   - PostgreSQL + `pgvector` schema and TypeScript interfaces for: `brand_guidelines` (`section_code`, `title`, `category`, `content`), `approved_facts` (`fact_key`, `claim_statement`, `exact_value`, `source_doc`), `brand_rules` (`banned_terms`, `preferred_terms`, `approved_hex_colors`, `min_wcag_ratio`), `submissions` (`id`, `title`, `content_type`, `body_text`, `image_meta`, `status`: `draft | audited | changes_requested | approved`, `author_name`, `reviewer_name`, `created_at`), `audit_findings` (`id`, `submission_id`, `category`: `tone | terminology | fact_claim | visual | accessibility`, `severity`: `high | medium | low`, `exact_span`, `start_index`, `end_index`, `rule_citation`, `source_excerpt`, `explanation`, `suggested_fix`, `intent_preservation_score`, `reviewer_status`: `pending | accepted | overridden`, `override_reason`), `review_comments`, and `revision_history`.

2. `src/lib/seed-data.ts` & `src/lib/repository.ts`:
   - Seed "Acme Cloud" with:
     * 5 Brand Guidelines (`BG-1.1 Voice & Tone`, `BG-1.2 Product Terminology`, `BG-2.1 Verified Metrics & Claims`, `BG-3.1 Brand Color Palette`, `BG-3.2 Accessibility Standards`).
     * 4 Verified Facts (`99.95%` uptime SLA, `15 minutes` enterprise support response, `10 GB` free storage, `SOC2 Type II` certified).
     * Banned Terms (`revolutionary`, `game-changing`, `100% uptime`, `guaranteed`, `ACC`, `autonomous AI`) mapped to preferred terms.
     * Approved Hex Palette (`#4F46E5`, `#0F172A`, `#10B981`, `#F8FAFC`).
     * 3 Ready-to-Inspect Submissions:
       1) "Acme Cloud Product Launch Blog" (Audited — contains planted errors: `game-changing`, `ACC`, `100% uptime`, `5-minute support response`, `autonomous AI`).
       2) "Q4 Social Promo Banner" (Audited — foreground `#94A3B8` on background `#F8FAFC` failing WCAG 4.5:1 contrast + off-brand button `#FF5733` failing CIELAB Delta-E distance).
       3) "Security Compliance Update" (Approved — shows a completed approval trail and certificate).

3. `src/lib/audit/` (Hybrid Deterministic + AI Audit Engine):
   - `privacy.ts`: `redactSensitiveData(text)` masking emails, phone numbers, and API keys (`sk-...`, `Bearer ...`) before external LLM inference.
   - `deterministic.ts`:
     * Exact banned-term & preferred-terminology scanner returning character offsets and `BG-1.2` citations.
     * Numeric/metric checker comparing percentages, response times, and storage units against `approved_facts` citing `BG-2.1`.
     * Visual & WCAG 2.1 validator computing exact WCAG contrast ratio between foreground/background hex colors (flagging `< 4.5` citing `BG-3.2`) and RGB-to-CIELAB Euclidean Delta-E color distance against approved brand hex colors (flagging `> 12` citing `BG-3.1` with nearest approved color suggestion).
   - `engine.ts`: Orchestrates Tier 1 deterministic findings + Tier 2 tone/claim-entailment checks + `Creator-Intent Preservation Score` (0–100%) for every suggested fix (uses OpenAI API structured outputs when `OPENAI_API_KEY` is present, with a deterministic semantic fallback when offline).

4. Next.js API Routes (`src/app/api/`):
   - `GET/POST /api/knowledge`
   - `GET/POST /api/submissions`
   - `GET/PATCH /api/submissions/[id]`
   - `GET /api/analytics`
   - `POST /api/seed/reset`

5. Complete Frontend UI (`src/app/`):
   - `src/components/Navbar.tsx`: Top bar with "VeriBrand AI • Team ArticXCoders", navigation links (`Submissions`, `New Audit`, `Brand Knowledge`, `Gap Radar`, `Disclosures & Roadmap`), Role Switcher (`Content Creator`, `Brand Reviewer`, `Brand Admin`), and "Reset Demo" button.
   - `/` (`src/app/page.tsx`): KPI cards + Submissions Queue + clear "Quick Judge Guide" banner explaining how to test a draft or review findings in 30 seconds.
   - `/audit/new`: Two tabs — Text Copy Audit (with 1-click "Load Sample Risky Draft" button + PII redaction badge) and Visual & WCAG Contrast Audit (hex pickers, live preview card, contrast ratio + brand color distance check).
   - `/review/[id]`: Side-by-side Cited Inline Diff & Approval Workspace — highlighted text/visual on the left; explainable finding cards on the right with Rule Citation pill, Approved Source Excerpt, Red/Green Diff, Creator-Intent Preservation Score bar, "Accept Fix" and "Override with Reason" buttons; plus threaded Reviewer Comments, Role-Based Sign-Off (`Request Changes` / `Approve for Publish`), and Immutable Revision History.
   - `/knowledge`: View & add Brand Guidelines, Approved Facts, Banned Terms, and Brand Colors.
   - `/analytics`: Guideline Gap Radar showing recurring violation categories and most-violated rules.
   - `/disclosures`: Shows our system architecture, AI/tool disclosures (OpenAI API, Next.js, Supabase, Vercel, Codex CLI), Team ArticXCoders contributions, and the 3 major improvements committed for Round 3.

Make sure `npm run build` passes with zero TypeScript or Next.js App Router errors.
