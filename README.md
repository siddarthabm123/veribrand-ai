# VeriBrand AI — Team ArticXCoders

An explainable brand-governance workspace for checking copy and campaign assets before publication. The Acme Cloud demo workspace is pre-seeded so judges can try it without an account, API key, or database setup.

## Project overview

Growing organisations publish through employees, agencies, and AI tools. Incorrect claims, stale facts, inconsistent terminology, off-brand visuals, and inaccessible colors can erode trust. VeriBrand compares drafts with approved rules, explains findings, suggests focused corrections, and leaves publication decisions with a human reviewer.

### 30-second judge walkthrough

1. Open `/impact` (or select **Brand Passport** from the floating launcher).
2. Edit the risky sample copy or keep it. Inspect each finding’s exact rule citation and source.
3. Apply a focused fix. The message stays intact while the flagged phrase changes.
4. Select **Send to human review** and open the saved record.
5. Accept a fix or override it with a reason, add a comment, and approve only after pending findings are resolved.
6. Export the JSON Brand Passport with findings, sources, and checks run/not run.

Other routes include `/audit/new`, `/review/launch-blog`, `/knowledge`, `/analytics`, and `/disclosures`. The demo does not require a login or API key.

## Problem, users, and workflow

The product serves content creators, brand reviewers/managers, and brand administrators in organisations publishing across teams and channels. Its goal is to prevent avoidable brand risk without turning governance into an opaque rejection gate.

**Workflow:** maintain guidelines and verified facts → submit copy or a visual asset → run deterministic checks and optional AI review → inspect source-cited findings → apply or override suggestions → collaborate in comments → record human sign-off and revision history → use repeated findings to improve guidance.

The demo includes text review and a visual contrast preview, plus sample facts, terminology, and palette. Image/document ingestion and full color-distance analysis are future work unless completed and verified separately.

## System architecture and technical decisions

- **Next.js App Router and TypeScript:** route-based UI and API handlers in one deployable application.
- **Tier 1 deterministic checks:** exact terminology scans, approved numeric-claim checks, and WCAG contrast calculation provide repeatable results for supported rules.
- **Tier 2 AI verification:** the engine redacts emails, phone numbers, and common API-token patterns before its optional OpenAI request. AI is disabled when `OPENAI_API_KEY` is absent. The current engine does not yet convert the AI response into structured findings; displayed findings come from deterministic checks.
- **Hybrid repository:** an in-memory demo store is used without Supabase credentials. When configured, the repository attempts Supabase writes. Browser `localStorage` keeps Brand Passport drafts, submissions, review changes, and exported passport records available on that browser across navigation and serverless cold starts. Browser storage is device-local, not cross-device collaboration.
- **Database model:** `supabase/schema.sql` documents PostgreSQL/pgvector tables for guidelines, facts, rules, submissions, findings, comments, and revision history.
- **UI stack:** React, Tailwind CSS v4, and Lucide icons.

### Optional environment variables

Copy `.env.example` to `.env.local` only when configuring optional services. Never commit `.env.local` or production secrets.

| Variable | Purpose | Required for demo? |
| --- | --- | --- |
| `OPENAI_API_KEY` | Optional tone/claim review request after PII redaction | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase access | No |

## Local development and Vercel

Requirements: Node.js supported by the installed Next.js version and npm.

    npm install
    npm run dev
    npm run build
    npm run start

Open `http://localhost:3000`. For Vercel, import the repository and use the Next.js preset. The seeded demo works without environment variables. Add optional secrets only in Vercel project settings. A clean local build does not replace checking the deployed URL and API routes.

## AI, tools, libraries, and reused material disclosure

- **OpenAI Codex CLI:** used as AI-assisted development support for code generation, editing, and debugging in this workspace. Team members must review the implementation and accurately describe their personal contributions.
- **OpenAI API:** optional runtime review request. PII redaction runs before the request; the demo works without an API key.
- **Next.js 16, React, TypeScript, Tailwind CSS v4, Lucide React:** framework, UI, styling, and icons.
- **Supabase JS, PostgreSQL, and pgvector:** optional persistence client and documented schema.
- **Vercel:** intended deployment platform; do not claim a live deployment until it has been deployed and checked.
- **Starter material:** the repository began from a Next.js starter. Disclose that starter and any other reused material in the event submission, and verify third-party licenses.

The supplied event rules permit AI and existing libraries but require disclosure of significant tools and reused code. Do not claim interviews, user testing, production integrations, deployment, or individual work without evidence.

## Three planned Round 3 improvements

1. **Guideline learning loop:** turn reviewer overrides into admin-reviewed proposals to clarify or update rules; never silently change policy.
2. **Multilingual governance:** add locale-aware terminology and guidance, with reviewers verifying translated claims and their sources.
3. **Design-system connectors:** import approved Figma tokens/assets and detect palette or component drift against the active brand system.

## Team ArticXCoders contributions

| Team member (full name) | Role | Individual contribution / evidence |
| --- | --- | --- |
| Siddartha B M | AI Audit Engine, Custom Rules & Retrieval Architecture | Deterministic and custom-rule audit flow, evidence citations, and retrieval architecture. |
| [Teammate 2 Name] | Next.js Diff Workspace, Brand Passport & Visual WCAG Inspector | Review workspace and diffs, Brand Passport workflow, and visual contrast inspection. |
| [Teammate 3 Name] | Gap Radar Analytics, Session State & End-to-End QA | Workspace analytics, session persistence, and end-to-end quality checks. |

Each teammate should complete any required individual form. Confirm the remaining two participant names and spellings before submitting the event form.

## Limitations and responsible use

This is a hackathon prototype, not a production compliance guarantee. In-memory server data can reset between serverless invocations; browser-local records are available only in the same browser profile. Supabase reads and writes are partial and should be fully connected and tested before multi-user production use. Optional AI responses are not currently structured into audit findings. Validate privacy, accessibility, role permissions, API failure states, and deployed behavior with realistic user feedback before relying on this for publication decisions.
