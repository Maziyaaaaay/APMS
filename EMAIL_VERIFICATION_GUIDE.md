# APMS email verification setup

This guide explains what is needed to add email verification to APMS and how to prepare an email sender for the college pilot.

## Important: current APMS status

The current APMS signup code uses APMS's own password records and JWT login. It does not send confirmation messages or check whether an email address has been verified. Supabase's **Confirm email** switch applies to Supabase Auth accounts; APMS does not use Supabase Auth for its current login flow. Turning that switch on or configuring Supabase SMTP by itself will not add verification to APMS.

The application needs a code update before the setup steps below can take effect. That update must add a verification token flow, store verification state, send a confirmation link, and prevent login until the link is confirmed. Do not run the old migration 008 or change Supabase Auth settings for this purpose unless the matching APMS code release specifically instructs you to.

## Recommended path for the college pilot

For a small, supervised pilot, an existing Gmail address can be used as a temporary sender through Gmail SMTP. It does not require a college-owned domain. Google may restrict this setup, and a personal Gmail account is not a good long-term sender for a larger rollout. For a broader launch, use an email service with a domain the college controls.

## Part A — Prepare a Gmail sender (pilot only)

1. Choose a Gmail account dedicated to APMS messages if possible. Avoid using an account that contains sensitive personal correspondence.
2. Sign in to that Google Account and enable **2-Step Verification** under **Security**.
3. Open Google Account **App passwords**: <https://myaccount.google.com/apppasswords>.
4. Create an app password for APMS. Save the generated password somewhere secure. It is a mail credential; do not send it in chat, commit it to GitHub, or put it in frontend code.
5. Use these SMTP details when the APMS email-sending code is ready:

   | Setting | Value |
   |---|---|
   | SMTP host | `smtp.gmail.com` |
   | SMTP port | `587` |
   | Encryption | STARTTLS / TLS |
   | SMTP username | The full Gmail address |
   | SMTP password | The Google app password from step 4 |
   | Sender email | The same Gmail address |
   | Sender name | `KTU APMS` |

If Google does not offer App passwords for the account, check its account security rules or use a transactional email provider instead. Google Workspace accounts managed by an organization may have extra restrictions.

## Part B — Add sender settings to Vercel

Do this only after the APMS code update documents the exact variable names it reads. The names below are the intended server-side settings; they are not currently read by the checked-in signup code.

1. Open the Vercel dashboard and select the project that serves <https://ktuapms.vercel.app>.
2. Open **Settings → Environment Variables**.
3. Add each variable below for **Production**. Add them to **Preview** only if you will test signup on preview deployments.

   | Variable | Value |
   |---|---|
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | Your full Gmail address |
   | `SMTP_PASS` | Your Google app password |
   | `SMTP_FROM_EMAIL` | The same Gmail address |
   | `SMTP_FROM_NAME` | `KTU APMS` |
   | `APP_BASE_URL` | `https://ktuapms.vercel.app` |

4. Mark the password variable as sensitive if Vercel offers that option. Keep all SMTP values server-side; do not name them with a `VITE_` prefix.
5. Save the variables. Vercel applies changed variables to new deployments, so deploy the APMS version that includes email verification after saving them.

> If the released code uses different variable names, follow the names in that release instead. Adding environment variables alone does not implement email verification.

## Part C — Verify the deployed signup flow

Use your own test email and a test account. Do not use real student records for this test.

1. Open <https://ktuapms.vercel.app/signup> and create a test account with an email inbox you can access.
2. Confirm APMS says a verification message was sent and does not treat the account as verified yet.
3. Try signing in before opening the message. APMS should prevent access and offer a way to resend the confirmation email.
4. Open the message and follow its APMS confirmation link. Check Spam/Junk if it is missing.
5. Confirm APMS reports success, then sign in.
6. Confirm the account still follows the normal approval process: student accounts wait for faculty approval; faculty accounts wait for admin approval.
7. Test an expired or already-used link if the release provides a safe way to do so. The app should show a clear message and allow a fresh confirmation email.
8. Check Vercel function logs if sending or confirmation fails. Never copy SMTP credentials into a support message or log.

## For a college-wide or multi-college launch

Before expanding beyond a supervised pilot, arrange a domain the college controls (for example, `apms.college-domain.edu`) and use a transactional email provider. Verify the sending domain and configure SPF, DKIM, and DMARC according to that provider's instructions. This improves delivery and makes the sender identifiable. Keep provider credentials in Vercel server-side environment variables and rotate them if they are exposed.

## Troubleshooting

- **No email-verification option or message:** the deployed APMS version may not include the verification feature yet. SMTP settings alone cannot add it.
- **Supabase's confirmation email is not sent:** APMS's custom login does not automatically use Supabase Auth confirmation. Configure the APMS email flow when it is available.
- **Gmail authentication fails:** confirm 2-Step Verification is enabled, use an App password rather than the normal Google password, and check whether the account administrator blocks app passwords.
- **The message sends but lands in spam:** confirm the sender address matches the authenticated account. For wider use, move to a verified sending domain and transactional provider.
- **Changes do not appear after adding Vercel variables:** create a new deployment; existing deployments do not receive newly saved environment variables.

## Official references

- Google: [Use or fix App passwords](https://support.google.com/accounts/answer/2461835?hl=en)
- Google: [Send email from a printer, scanner, or app](https://support.google.com/a/answer/176600?hl=en)
- Vercel: [Manage environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- APMS signup implementation: `server/routes/auth.js`
