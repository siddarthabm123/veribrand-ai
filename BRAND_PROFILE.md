# Account brand profiles

Signup collects a brand name in addition to the person's name. Supabase stores `brand_name` in the account's user metadata. Sign-in and signup session display state uses that name, and `BrandIdentity` reads the current authenticated user rather than hard-coding Acme Cloud. Existing users can open `/brand` or **My brand** to update their brand name and optional description with `auth.updateUser({data: ...})`.

This is display/profile metadata, never an authorization source. It does not assign reviewer/admin roles, provision workspace membership, change evidence rules, or create a separate tenant. The existing backend remains a single shared workspace. Independent brand teams and data require a separate tenant-isolation implementation. The judge sandbox stays fictional and separate.

Profile changes are persisted by Supabase Auth, not an unscoped browser-local brand key. Normalized names are 2–80 characters; descriptions are limited to 500 characters. Missing/unauthenticated profiles show a sign-in/add-brand action rather than claiming the user belongs to Acme Cloud.

Verification covers TypeScript, lint, production build, and the signup/profile page states. Real account signup and metadata writes require configured Supabase credentials; they cannot be verified on an unconfigured local demo.
