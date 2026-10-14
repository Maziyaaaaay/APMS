# APMS v2 database structure

The owner chose a fresh rebuild without a live backup on 2026-10-07. This supersedes the earlier migration-and-backup plan. No live database operation has been performed from this workspace.

## Installation

Run `server/db/rebuild.sql` once in the SQL Editor for KTU APMS (`xikqrthyuuqhptunigde`). The same browser-ready file is provided in `outputs/APMS_REBUILD.sql` outside this repository. It drops only the named APMS tables and rebuilds them in a single transaction. Unexpected external dependencies cause a rollback; it does not use `CASCADE` to remove unrelated objects.

`server/db/schema.sql` is the complete baseline for an empty database. Do not run the historical migration 001 after the v2 baseline. The snapshot and migration remain historical reference files, not part of the v2 deployment path.

For a database already created from the earlier v2 baseline, apply migrations `003_certificate_academic_year.sql` and `004_circular_priority.sql` from `server/db/migrations/` in Supabase SQL Editor before deploying this code. They preserve existing submissions/circulars, and academic year is optional for new submissions. Migration 003 has been corrected in the repository. If the earlier version of migration 003 was already applied, also run `007_optional_academic_year.sql` once; it removes the database trigger's academic-year requirement without changing stored records. Do not apply migrations 003/004 after rebuilding from the current `schema.sql` or `rebuild.sql`, since those already include the columns. The banner feature additionally requires migration `006_profile_cover_banners.sql` before that feature is deployed.

## Data and access

- `departments`: canonical department IDs and names. Faculty scope uses IDs. The legacy display name on users is populated by a database trigger and follows department renames.
- `users`: bcrypt password hash, role, approval status, signup email-confirmation timestamp, department ID, student category, profile, and session version. New accounts default to pending. All student/faculty accounts require a department. Usernames are case normalized and unique; non-empty roll numbers are case normalized and unique.
- `certificates`: private file path and metadata, event/date, immutable activity snapshot and catalog version, provisional points, review state, reviewer, and explanation. Submissions must be from approved students. Faculty reviews are restricted by department in the API and database. Completed reviews cannot be overwritten or deleted through the API.
- `account_review_events` and `certificate_review_events`: audit records created by triggers within the same transaction as the decision. The service role can insert/read but cannot update/delete audit entries.
- `circulars`: admin-authored notices with optional official URL and issue date.
- `point_overrides`: legacy table name retained for administrator notes only. A database constraint rejects scoring overrides.

RLS is enabled on every app table. Anonymous and authenticated Supabase browser roles have no direct access. All app access goes through the Express API using a server-only Supabase key. A restrictive Storage policy prevents old permissive policies from granting browser roles access to the private certificate bucket. Files are served using short-lived signed URLs.

## One owner

Before provisioning, the database intentionally has no owner. The hosted startup provisions the first one from secret environment values when `APMS_BOOTSTRAP_ADMIN=true`. A unique index permits only one super admin; an active-admin constraint prevents disabling that owner; a deferred constraint requires an owner to remain after any ownership change. The password-confirmed handover endpoint calls one database transaction to demote the former owner and promote an existing approved admin. Both sessions are invalidated. The former owner remains a regular admin.

Additional admins can be created or promoted by the super admin. Password, role, approval, and ownership changes increment the session version, so existing tokens lose access immediately.

## Storage cleanup and portability

Rebuilding Postgres does not remove stored certificate bytes. Empty the APMS certificate bucket through Supabase Storage before reopening registrations. Do not delete `storage.objects` rows using SQL: that does not reliably remove the stored files. The guarded storage cleanup script remains an alternative for hosted administrators.

Supabase Auth is used to send and validate email confirmation for self-service signup; APMS still authenticates application sessions against `public.users`. The Auth account is not used as an APMS login. This reset concerns APMS users in `public.users`. The data model uses PostgreSQL and the service key stays on the server, so the relational data can move to another PostgreSQL host with a schema-and-data export. Certificate files live separately in private object storage: moving providers also requires a private object copy, a file-path manifest/checksum check, and a server storage-adapter change. A provider switch alone is not a migration.

## Validation and remaining work

The complete SQL has been executed against an isolated PostgreSQL runtime with stand-ins for Supabase roles/storage tables. Checks cover repeated rebuild, owner uniqueness and handover, account approval audit, session invalidation, faculty department scope, review immutability, transaction rollback on audit failure, table access, and restrictive bucket policy. These checks do not replace verification against the live Supabase environment.

The current KTU catalog maps the 2024 handbook's Group I (1.1–1.21), Group II (2.1–2.25), and Group III (3.1–3.17) identifiers. Point totals remain provisional until eligibility evidence, academic-year/segment limits, and the handbook copy are verified by faculty against current KTU publications. The app preserves v3 submission IDs and maps v2 snapshots to the corrected IDs for display and estimates. Password recovery, MFA, and deployment abuse controls remain future public-release work. Signup email confirmation is implemented separately and requires migration 008 plus Supabase Auth SMTP and redirect settings.
