# APMS rebuild and web deployment

The owner requested rebuilding without a backup. Homebrew, Docker, and local PostgreSQL are not required for the browser setup.

1. Open the existing **KTU APMS** project (`xikqrthyuuqhptunigde`) in Supabase. In **SQL Editor**, create a new query, paste `server/db/rebuild.sql`, and run it once. This deletes APMS records and creates the new structure atomically. Do not apply historical migration 001 after this script.
2. In **Storage**, empty old APMS certificate files from the `apms-certificates` bucket before enabling the new app. The SQL leaves file bytes in place and makes the bucket private. Other buckets are outside this reset's scope.
3. Put the updated repository on the chosen GitHub branch. This local workspace has not been pushed yet.
4. Create the web service using `render.yaml`. It builds both the client and server and serves them from one public origin. The frontend uses `/api`, so a separate frontend host is unnecessary.
5. In the hosting provider's private environment settings, set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, a random `JWT_SECRET` of at least 32 characters, and `CORS_ORIGINS` to the app's public origin. Configure `APMS_BOOTSTRAP_ADMIN=true`, `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_PASSWORD` (12+ characters, at most 72 UTF-8 bytes), and `SUPER_ADMIN_NAME`. Email is optional. The username uses 3–64 letters/numbers/dots/underscores/hyphens. Never use a browser `VITE_` variable for server secrets.
6. On the first hosted startup, the API creates one super admin from those environment values. Failed initialization stops startup. After the first successful login, set `APMS_BOOTSTRAP_ADMIN=false` and remove the `SUPER_ADMIN_PASSWORD` environment value. Restarting does not replace an existing admin's credentials.
7. Register one faculty member and one student, approve them as admin, then verify submission, private file preview, approval/rejection, and department scope on the actual deployed app before inviting others.

The reset has not been run on Supabase. The production client build, isolated database checks, and startup/page/API smoke checks passed. Startup checks used dummy database credentials and made no live Supabase requests. KTU totals remain provisional, and broad public rollout still needs password recovery, email verification, MFA decisions, abuse controls, and completed official-rule reconciliation.
