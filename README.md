# VeriBrand AI — Team ArticXCoders

## Complete governance workflow

- **Claim Evidence Library** at `/evidence`: search approved wording and source documents; demo admins can add an evidence entry with a source link and a named approval. The evidence pack has a deterministic version fingerprint.
- **Review decisions** at `/impact/review/[id]`: accept, edit, reject, or override individual findings. Rejections stay open; overrides require a reason. Each action records a name, demo role, timestamp, source, and content version. Original/current text and recorded before/after revisions remain inspectable.
- **Brand Passport**: download PDF, Markdown, or JSON with the full checks, unrun checks, original/current content, sources, comments, and decision trail. Share a version-pinned `/passport/[id]?version=N` view. Old links refuse to imply approval after content advances.
- **Accessibility inputs**: compute precise contrast for declared foreground/background colors (normal text 4.5:1, large text 3:1), match declared palette values, and flag missing alt text for declared informative images. Uploaded-image sampling remains an estimate; semantic description quality and final published markup need human review.
- **Readiness and publish gate**: the displayed score deducts 25/10/5 per open high/medium/low finding. A score of 100 is not approval. The server gate requires no unresolved findings, a recorded sign-off, a matching content fingerprint, an unchanged evidence pack, and the approved channel. Content edits clear approval and rescan the draft.

Start at `/impact`. The demo runs without credentials. `npm test` checks the governance model; `npm run lint` and `npm run build` run project checks.

### Persistence and review scope

Versioned governance records are stored in the existing `submissions.image_meta.governance_record` JSONB envelope, including the canonical findings/comments snapshot, evidence snapshot, and append-only decision trail. No new database schema is required. Updates use a revision comparison to reject stale writes; legacy finding/comment/history tables remain mirrors for compatibility. Without Supabase, the same workflow uses an in-memory demo store and cannot guarantee survival across serverless cold starts or cross-instance sharing. The shared database is required for durable share links.

Reviewers are self-selected demo personas, not authenticated identities. Use non-sensitive demo content: anyone who has a passport URL can view the record. The SHA-256 value is a content fingerprint, not a cryptographic signature or compliance guarantee. Only checks actually executed are marked pass/fail; semantic AI review and full WCAG/legal compliance are not certified. The existing optional AI request is not used as a structured enforcement finding.

PDFs wrap long lines and paginate the full trail. Characters outside the built-in PDF font appear as Unicode code points; JSON and the web view preserve the original Unicode text.

### Review API

`PATCH /api/submissions/:id` accepts a named action (`accept`, `edit`, `reject`, `override`, `revise`, `approve`, `request_changes`, `comment`, or `rescan`), `expectedRevision`, and a named demo `actor`. Direct client-supplied approval statuses or findings arrays are rejected. Stale revisions return 409; the reviewer should reload. `GET /api/submissions/:id/passport?format=pdf|json|markdown&version=N` exports the saved server record.


An explainable brand governance workspace that checks campaign copy and assets before publication. It cites the rule behind each finding, offers focused fixes, and keeps a human reviewer in control. A seeded Acme Cloud demo works without a login or API key; add Supabase for durable shared records.

## Demo Account Credentials

| Email | Password | Role permissions |
| --- | --- | --- |
| `reviewer@acmecloud.demo` | `VeriBrand@2026` | Review findings, comment, approve, and export compliance records. |
| `creator@acmecloud.demo` | `VeriBrand@2026` | Submit campaign drafts and inspect suggested fixes. |
| `admin@acmecloud.demo` | `VeriBrand@2026` | Manage brand facts, guidelines, and rules. |

Demo sign-in is a friction-free prototype persona selector, not real authentication or authorization. The UI also permits a custom `*.demo` email. Do not use real credentials.

## Run locally

```bash
git clone <repository-url>
cd veribrand-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables are mandatory for the seeded demo. Production compilation: `npm run build`.

## 30-second judge walkthrough

1. Open `/impact` and choose the sample Brand Passport flow.
2. Inspect cited findings and edit the campaign text or banner.
3. Send it to review, accept a focused change or record an override, then approve.
4. Export the PDF compliance certificate and test the webhook gate before and after approval.
5. Open `/analytics` for the Gap Radar and rule auto-drafter; publish an approved proposal and test the new rule from `/audit/new`.

## Features

- Tier 1 deterministic audit for verified claims, custom banned phrases, and supported accessibility checks.
- Multi-format brief and banner inspection for TXT, Markdown, DOCX, PDF (best-effort text extraction), PNG, JPG, and WebP. Browser image analysis reports sampled colors, palette distance, contrast, and layout checks.
- Source-cited findings, focused fixes, reviewer comments, overrides, approval history, and role-oriented demo sessions.
- Brand Passport, Gate Simulator API, PDF certificate, Gap Radar analytics, and reviewer-informed guideline proposals.
- PII redaction before the optional AI review request; no API key is required for deterministic checks.

## Round 3 improvements delivered

1. **Document and banner inspector:** uploads common brief formats and image assets, extracts text where supported, computes color and contrast checks in the browser, and presents an inspection report.
2. **Guideline Gap Auto-Drafter:** derives reviewable proposals from recurring findings and overrides. A human approves a proposal before it becomes an active Brand Knowledge rule.
3. **Live pre-publish gate and PDF certificate:** `POST /api/webhook/gate` returns `403 BLOCKED` while findings remain unresolved, and `200 APPROVED` with a version-bound content fingerprint after sign-off. The review and Brand Passport flows can generate a downloadable PDF certificate.

## Architecture and technical decisions

- **Next.js App Router, React, TypeScript:** UI pages and server API routes are deployed as one application.
- **Tier 1 rules:** deterministic checks make supported phrase, fact, and contrast decisions repeatable and cite their rule source.
- **Tier 2 AI:** when `OPENAI_API_KEY` is configured, the audit engine sends a PII-redacted review request. Deterministic findings remain available without it. AI output is not currently converted into structured findings, so the product does not rely on the AI request for enforcement.
- **Hybrid persistence:** with server-side Supabase credentials, repository reads/writes cover submissions, findings, comments, revision history, and custom guideline rules. Without Supabase, an in-memory seeded server fallback and browser `localStorage` keep the demo usable. Browser storage is device-local and does not synchronize between users.
- **Supabase security:** service/secret keys are server-only. Row Level Security is enabled by `supabase/enable_rls.sql`; apply it in the Supabase SQL Editor for an existing project. This prototype uses a server admin client and does not provide authenticated per-user database authorization, so expose it only to a trusted demo audience until real authentication and policies are implemented.
- **Vercel:** compatible with the Next.js preset. A deployment is live only after its URL has been checked.

### Optional environment variables

Copy `.env.example` to `.env.local`. Never commit secrets. The server supports these names and legacy aliases:

| Variable | Purpose | Required? |
| --- | --- | --- |
| `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Server-only database access | No |
| `OPENAI_API_KEY` | Optional PII-redacted AI review request | No |

Apply `supabase/schema.sql` for a new database, or `supabase/enable_rls.sql` to enable RLS on an existing database. Never expose a secret/service key in a `NEXT_PUBLIC_` variable.

## Verification scenarios

- Run `npm run lint` and `npm run build`.
- Open `/`, `/welcome`, `/audit/new`, `/knowledge`, `/analytics`, `/impact`, and `/disclosures` directly and refresh each route.
- Add a banned phrase in Brand Knowledge, run a new audit containing it, and verify the new rule citation appears.
- Upload the included sample brief and promo banner, then inspect the reported checks.
- Test the gate on an unapproved submission (blocked), approve it, and test again (approved). Download and inspect the generated PDF.
- With Supabase configured, add a rule and submission, refresh, and confirm they persist. Without Supabase, check the seeded local demo path.

## AI, tools, libraries, and reused material disclosure

- **OpenAI Codex CLI:** AI-assisted development, code editing, and debugging. Team members should describe their own reviewed contributions accurately.
- **OpenAI API:** optional runtime review request; sensitive data is redacted before the request.
- **Next.js, React, TypeScript, Tailwind CSS, Lucide React, Mammoth, pdf-lib, Supabase JS:** application framework, UI, document extraction, PDF generation, and database client.
- **Vercel:** hosting and deployment platform.
- **Design assets and fonts:** see `public/fonts` and repository asset sources/licenses; disclose starter material and any other reused work in the event submission.

## Team ArticXCoders contributions

| Team member | Role and contribution |
| --- | --- |
| Siddartha B M | AI Audit Engine, Custom Rules & Retrieval Architecture |
| [Teammate 2 Name] | Next.js Diff Workspace, Brand Passport & Visual WCAG Inspector |
| [Teammate 3 Name] | Gap Radar Analytics, Session State & End-to-End QA |

Replace teammate placeholders with verified full names before final submission.

## Responsible use and limitations

This is a hackathon prototype, not a production compliance guarantee. Demo role selection is not an authentication system. The optional AI response currently does not create structured findings. Browser-local state is limited to one browser profile, while Supabase-backed records are shared by this server-admin prototype. Validate policies, access control, privacy, accessibility, and deployed behavior before making publication decisions from it.
