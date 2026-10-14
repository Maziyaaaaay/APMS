# COET ET Lab student verification setup

Student signup verifies a student's COET ET Lab login through a verifier hosted
in the APMS Render workspace. The verifier uses the official COET ET Lab portal
at `https://coet.etlab.in`, checks the profile's KTU registration number, and
returns only the verified name. APMS creates a short-lived signed proof for the
next signup step.

APMS and the verifier do not store ET Lab passwords or ET Lab session cookies.
Each verification uses a fresh session that is discarded when the request ends.
Students create a separate APMS password. Account approval remains with the
department faculty advisor.

## Deploy the verifier on Render

Create a **Python Web Service** from the APMS GitHub repository:

- Root directory: `etlab-verifier`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT`
- Health check path: `/api/status`
- Plan: Free
- Region: same region as `apms-api`

Add `ETLAB_VERIFIER_SHARED_SECRET` as a Render environment variable. Use a new,
random secret of at least 32 characters. Never place it in the client app, GitHub,
or a student-facing form.

After the verifier deploys, copy its HTTPS service origin (for example,
`https://your-coet-verifier.onrender.com`). In the existing `apms-api` Render
service, set these environment variables:

- `ETLAB_API_BASE_URL` = the verifier's HTTPS origin
- `ETLAB_VERIFIER_SHARED_SECRET` = the exact same secret as the verifier

Save the settings and redeploy `apms-api`. The verifier's `/api/verify` route is
protected by the shared secret and rate-limited. `/api/status` contains no
student data and is used only for the Render health check.

## Signup behavior

1. Student enters the KTU registration number and COET ET Lab login details.
2. APMS asks the COET verifier to sign in, fetches the profile, and checks that
   the profile registration number matches.
3. The verifier returns only the profile name. Password and session are dropped.
4. Student enters contact and academic details and sets a separate APMS password.
5. APMS submits the account as pending faculty approval.

The integration uses COET ET Lab's web login and profile pages; it is not an
official ET Lab API. If COET or ET Lab changes those pages, the verifier fails
closed until its parser is updated.
