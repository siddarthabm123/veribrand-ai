# Judge demo

Open `/judge`, or choose **Try judge demo** on the landing page, account screens, or dashboard. No account, workspace membership, database, or AI provider is required.

The sandbox has four fictional Acme Cloud campaigns:

1. Risky launch copy: inspect four findings, accept each correction, approve the revised version, check the local publishing result, and download a Passport.
2. Clean support email: approve a draft with no current findings.
3. Published campaign: compare an approved baseline with an altered snapshot, see the blocked gate, restore approved copy, and check again.
4. Expired evidence: attempt approval, renew the fictional source, then approve again.

Use **Reset judge demo** to restore all four scenarios. Demo state uses only the separate browser key `veribrand:judge-sandbox:v1`. It does not set account sessions, call workspace APIs, or change real database records. Different browsers have separate sandboxes. If browser storage is unavailable, the current tab remains usable.

The same pure scan, review-transition, evidence, fingerprint, Passport, and gate-check functions power the sandbox. Gate results are local simulations, explicitly labelled; they do not send a CMS request or grant real publishing permission. Demo PDF/JSON/Markdown downloads are labelled fictional. There are no public share links for browser-local records. Full legal compliance, semantic AI review, and full WCAG compliance are not claimed.

Validation: `node scripts/test-judge-demo.mjs`, TypeScript, lint, production build, and desktop/mobile browser walkthrough. The test checks scenario seeding, fixes, approval, edit invalidation, publishing drift, expired evidence, and fresh reset.
