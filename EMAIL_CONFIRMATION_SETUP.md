# Signup email confirmation setup

Email confirmation applies to new self-service signups. Existing APMS accounts keep working, and APMS username/password login remains unchanged after confirmation. Student/faculty approval still follows the existing APMS workflow.

## Before deployment

1. In Supabase, open **Authentication → URL Configuration**. Set the Site URL to `https://apms-flax.vercel.app` and add `https://apms-flax.vercel.app/auth/confirm` to the allowed redirect URLs.
2. In Supabase, open **Authentication → Providers → Email** and enable email confirmations.
3. Configure custom SMTP under **Authentication → SMTP Settings**. Supabase's built-in mail service is for testing, limits delivery to project team addresses, and currently allows only two messages per hour.
4. In Vercel, add these client environment variables to Production (and Preview if preview testing is needed):
   - `VITE_SUPABASE_URL`: the project URL.
   - `VITE_SUPABASE_ANON_KEY`: the project's publishable/anon key from **Project Settings → API Keys**.
   
   Do not use the Supabase service-role key in a `VITE_` variable; browser variables are public.
5. Run `server/db/migrations/008_signup_email_confirmation.sql` in the Supabase SQL Editor.
6. Deploy the application and test one student and one faculty signup with an address outside the Supabase organization.

A new signup stays out of the faculty/admin approval queue and cannot sign in until the confirmation link is used. After confirmation, students wait for their department faculty advisor; faculty wait for an administrator.


For the full launch checklist covering profile banners, conditional academic-year repair, email confirmation, and Vercel, see [RELEASE_SETUP_GUIDE.md](./RELEASE_SETUP_GUIDE.md).
