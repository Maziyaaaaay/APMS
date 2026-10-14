# APMS release setup guide

Use this guide to prepare the existing APMS Supabase project and Vercel deployment for the pending profile-banner and signup-email-confirmation changes.

> **Important:** This guide uses small, additive migrations. Do not run `server/db/rebuild.sql` or `server/db/schema.sql` against the live project. Those are rebuild/baseline scripts, not deployment migrations.

## What you need

- Access to the Supabase project `xikqrthyuuqhptunigde` (Tokyo).
- Access to the Vercel project that serves `https://ktuapms.vercel.app`.
- A configured SMTP sender for signup confirmation emails.
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
5. Configure a sender address on a domain verified with your email provider. The website URL ktuapms.vercel.app does not itself provide an email sender or mail domain.
6. Open **Authentication → URL Configuration**.
7. Set the Site URL to:

   `https://ktuapms.vercel.app`

8. Add this exact allowed redirect URL:

   `https://ktuapms.vercel.app/auth/confirm`

Leave the default confirmation template in place unless you have customized it to retain Supabase's confirmation link.

Keep SMTP credentials private; do not paste them into this guide, GitHub, or chat.

Supabase's default email sender is for testing: it only delivers to project-team addresses and has a low send limit. Public signups require a custom SMTP configuration. See [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp) and [redirect URL setup](https://supabase.com/docs/guides/auth/redirect-urls).

## 6. Add the browser-safe Supabase keys to Vercel

1. Open the Vercel dashboard and select the APMS project.
2. Open **Settings → Environment Variables**.
3. Add these variables for **Production**. Add them for **Preview** too if you want preview signups to work.
   - `VITE_SUPABASE_URL` = the APMS project URL, such as `https://xikqrthyuuqhptunigde.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the project's public anon/publishable key from Supabase **Project Settings → API Keys**
4. Save the variables.

The anon/publishable key is designed for browser use. **Never** put the Supabase service-role key in a `VITE_` variable. Keep the service-role key only in the backend environment.

## 7. Deploy and verify

The changes are still under review in the linked pull requests. Once the required database and email settings are ready, the changes can be merged and deployed.

After deployment, use test accounts and verify each step:

1. Submit a student signup with an email address you can access.
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
- **No email arrives:** confirm SMTP credentials and sender-domain verification, then try the resend button on the signup confirmation screen.
- **A SQL query fails:** stop and keep the exact error text. Do not run a rebuild script to work around it.

When steps 1–6 are complete, reply that the SQL fields, Supabase email settings, and Vercel variables are ready. The deployment can then be completed and tested.
