# COET ET Lab verifier

This small service verifies a student's COET ET Lab login during APMS signup.
It is configured for `https://coet.etlab.in` and is not a general ET Lab proxy.

## Privacy and security

- Each verification creates a fresh HTTP session; no student session is shared.
- ET Lab usernames, passwords, cookies, and session state are kept in memory only
  for one verification request and are discarded when it finishes.
- Request bodies, credentials, and cookies are never logged or stored.
- The service returns the verified name, KTU registration number, and the
  student's own email/mobile when present. It can return a department only if
  COET exposes a clearly labeled `Department` field. Contact data is used only
  to prefill signup fields for the student to review.
- APMS does not import unrelated personal, family, address, bank, or school
  records from the ET Lab profile.
- APMS must send the shared `ETLAB_VERIFIER_SHARED_SECRET` in the
  `X-APMS-Verification-Key` header. Set the same random value on this service and
  on the APMS API service in Render. Never put it in the browser or source code.
- Verification is limited to 12 attempts per client IP per minute.

## Render settings

Create a Python web service from the APMS repository with root directory
`etlab-verifier`:

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT`
- Health check path: `/api/status`
- Environment variable: `ETLAB_VERIFIER_SHARED_SECRET` (a random secret with at
  least 32 characters)
- Use the free plan and the same region as `apms-api` where available.

Set `ETLAB_API_BASE_URL` to the new service's HTTPS origin and set the same
`ETLAB_VERIFIER_SHARED_SECRET` on the existing `apms-api` service.

This is an unofficial integration based on COET ET Lab's web login and profile
pages. If the college's portal changes its form or profile labels, verification
will fail closed until the parser is updated.
