# APMS release setup guide

Use this guide to prepare the existing APMS Supabase project and Vercel deployment for the pending profile-banner and signup-email-confirmation changes.

> **Important:** This guide uses small, additive migrations. Do not run `server/db/rebuild.sql` or `server/db/schema.sql` against the live project. Those are rebuild/baseline scripts, not deployment migrations.

## What you need

- Access to the Supabase project `xikqrthyuuqhptunigde` (Tokyo).
- Access to the Vercel project that serves `https://ktuapms.vercel.app`.
- A configured SMTP sender for signup confirmation emails.
- APMS server SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`) configured in Vercel Production. `APP_BASE_URL` must be `https://ktuapms.vercel.app`.
- The linked GitHub pull requests:
  - [PR #23 — profile banners](https://github.com/Maziyaaaaay/APMS/pull/23)
  - [PR #26 — signup email confirmation](https://github.com/Maziyaaaaay/APMS/pull/26)

The migration SQL files are linked in the steps below. Open each file, copy its full contents, and run one file at a time.

## 1. Check the target Supabase project

1. Open the Supabase dashboard.
2. Select the project whose reference is `xikqrthyuuqhptunigde`.
3. Confirm it is the KTU APMS project and its database is the production database.
4. Open **SQL Editor** and create a new query.

If the project reference does not match, stop. Do not run any SQL in a different project.

## 2. Decide whether migration 007 is needed

Migration 007 is only needed if the earlier version of migration 003 was already run. That earlier version incorrectly required an academic year on each certificate.

- If you know migration 003 was never run, skip this step.
- If you know migration 003 was run, apply [migration 007](https://github.com/Maziyaaaaay/APMS/blob/main/server/db/migrations/007_optional_academic_year.sql).
- If you are unsure, run this read-only query in Supabase SQL Editor:

```sql
select pg_get_functiondef('public.apms_validate_certificate()'::regproc) as trigger_definition;
```

If the result contains `An academic year is required for a new submission`, apply migration 007. Otherwise, skip it. Migration 007 preserves certificate records and keeps academic year optional.

## 3. Add the profile-banner field

1. Open [migration 006](https://github.com/Maziyaaaaay/APMS/blob/feat/profile-cover-banners/server/db/migrations/006_profile_cover_banners.sql).
2. Copy the entire SQL file.
3. In Supabase SQL Editor, open a new query, paste it, and click **Run**.
4. Confirm the result says the query succeeded.

This adds a nullable banner field. Existing profile photos and other data are preserved.

## 4. Add the email-verification field

1. Open [migration 008](https://github.com/Maziyaaaaay/APMS/blob/codex/signup-email-confirmation/server/db/migrations/008_signup_email_confirmation.sql).
2. Copy the entire SQL file.
3. In Supabase SQL Editor, open a separate new query, paste it, and click **Run**.
4. Confirm the result says the query succeeded.

Existing APMS accounts receive a verification timestamp, so they keep access. New self-registrations begin unverified until they use the email link.

To confirm both fields exist, run this read-only query:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
  and column_name in ('profile_banner_url', 'email_verified_at')
order by column_name;
```

Expect two rows: `email_verified_at` and `profile_banner_url`.

## 5. Configure confirmation email in Supabase

1. In the project sidebar, open **Authentication → Providers → Email**.
2. Turn on **Confirm email** and save.
3. For SMTP, open **Authentication → Emails → SMTP Settings**. This is separate from Providers. If the project navigation is collapsed, expand **Authentication** first; current Supabase docs place SMTP under the **Emails** section.
4. Turn on **Enable Custom SMTP**, enter the SMTP host, port, username, password, sender email, and sender name from your email provider, then save.
5. Configure a sender address on a domain verified with your email provider. The Vercel website address `ktuapms.vercel.app` does not itself provide an email sender or mail domain.
6. Open **Authentication → URL Configuration**.
7. Set the Site URL to:

   `https://ktuapms.vercel.app`

8. Add this exact allowed redirect URL:

   `https://ktuapms.vercel.app/auth/confirm`

Leave the default confirmation template in place unless you have customized it to retain Supabase's confirmation link.

Keep SMTP credentials private; do not paste them into this guide, GitHub, or chat.

### Password resets

APMS uses its own password hashes, so Supabase Auth password recovery does not reset APMS accounts. APMS sends reset emails from its backend using the SMTP variables above. Configure these in Vercel **Settings → Environment Variables** for Production (server only; never use a `VITE_` prefix). The reset token is random, stored as a SHA-256 hash, expires after 30 minutes, and can be consumed once. `/forgot-password` requests a link and `/reset-password` accepts it. Successful resets update the APMS password hash and invalidate existing sessions via the database trigger. The Supabase auth redirect URL list is not used by this APMS-owned reset link.

Before deploying the password-reset flow, apply [`server/db/migrations/009_password_reset_tokens.sql`](server/db/migrations/009_password_reset_tokens.sql) to the APMS Supabase project. It creates the reset-token table and a service-role-only function that consumes a valid token and updates the password atomically. It is safe to run again if the table/function already exists. Do not use the profile-banner migration numbered `006` for password resets; `009` is the APMS reset migration number.

The reset page uses the same site origin as the API. Confirm `APP_BASE_URL=https://ktuapms.vercel.app` (or `APP_URL` with that same value) in Vercel Production. For Gmail SMTP, use port `587` with STARTTLS; port `465` is also supported and automatically uses TLS if `SMTP_SECURE` is not set. Redeploy after environment-variable changes.

Supabase's default email sender is for testing: it only delivers to project-team addresses and has a low send limit. Public signups require a custom SMTP configuration. See [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp) and [redirect URL setup](https://supabase.com/docs/guides/auth/redirect-urls).

## 6. Configure ET Lab student verification

Student signup verifies the student's ET Lab credentials through the approved RIT ET Lab API service, then matches the API's university registration number. APMS does not store the ET Lab password or its session token. The student creates a separate APMS password after verification.

In Vercel, open **Settings → Environment Variables** and add this server-only variable to Production (and Preview if you test signups there):

- `ETLAB_API_BASE_URL` = `https://rit-etlab-api.onrender.com`

Do not prefix it with `VITE_`. This value is used by the APMS backend only. The current service is community-maintained and scrapes the RIT ET Lab portal; it may be unavailable or stop working if ET Lab changes. The college has approved this integration for the pilot. If the college later hosts an approved copy, replace the value with that service's HTTPS origin. Redeploy APMS after saving the variable.

## 7. Add the browser-safe Supabase keys to Vercel

1. Open the Vercel dashboard and select the APMS project.
2. Open **Settings → Environment Variables**.
3. Add these variables for **Production**. Add them for **Preview** too if you want preview signups to work.
   - `VITE_SUPABASE_URL` = the APMS project URL, such as `https://xikqrthyuuqhptunigde.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the project's public anon/publishable key from Supabase **Project Settings → API Keys**
4. Save the variables.

The anon/publishable key is designed for browser use. **Never** put the Supabase service-role key in a `VITE_` variable. Keep the service-role key only in the backend environment.

## 8. Deploy and verify

The changes are still under review in the linked pull requests. Once the required database and email settings are ready, the changes can be merged and deployed.

After deployment, use test accounts and verify each step:

1. Submit a student signup using a test ET Lab account and an email address you can access. Confirm the returned registration number matches the ET Lab profile, then finish the APMS signup.
2. Confirm the email arrives. Check spam if needed.
3. Before clicking the email link, confirm the student cannot sign in and is not in the faculty approval queue.
4. Click the confirmation link. APMS should show **Email confirmed**.
5. Confirm the student now appears in the correct faculty advisor's approval queue; approve the test account and verify login.
6. Repeat signup and confirmation for a faculty test account; confirm it appears in the admin approval queue only after email confirmation.
7. Sign in with the existing super admin to verify existing access still works.
8. As a student and as a faculty member, upload and remove a profile banner.

Do not use a real student's registration number for testing unless you are ready to create that account.

## If something fails

- **Email address not authorized:** custom SMTP is not configured or the default sender is still active.
- **Redirect URL rejected:** check that the allowed URL exactly matches `https://ktuapms.vercel.app/auth/confirm`.
- **Signup says email confirmation is not configured:** check both Vercel variables and redeploy after saving them.
- **ET Lab verification is not configured:** add `ETLAB_API_BASE_URL` to the backend environment and redeploy.
- **ET Lab verification times out:** the service may be waking from sleep or temporarily unavailable; retry after a short wait.
- **Registration number does not match:** verify the KTU registration number and the ET Lab account belong to the same student.
- **No email arrives:** confirm SMTP credentials and sender-domain verification, then try the resend button on the signup confirmation screen.
- **A SQL query fails:** stop and keep the exact error text. Do not run a rebuild script to work around it.

When steps 1–6 are complete, reply that the SQL fields, Supabase email settings, and Vercel variables are ready. The deployment can then be completed and tested.

