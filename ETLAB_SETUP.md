# ET Lab student verification setup

Student signup verifies ET Lab identity on the APMS server. The student provides their ET Lab username and password, and APMS requests the RIT ET Lab verification service to sign in and retrieve the student's profile. APMS compares the returned university registration number with the KTU registration number and creates a short-lived signed proof for the next signup step.

APMS does not store the ET Lab password or the ET Lab session token. The student creates a separate APMS password. Account approval remains with the department faculty advisor.

## Vercel configuration

In the APMS Vercel project, open **Settings → Environment Variables** and add this variable for the environments where student signup should work:

- `ETLAB_API_BASE_URL` = `https://rit-etlab-api.onrender.com`

This is a backend-only setting. Do not name it `VITE_ETLAB_API_BASE_URL` and do not put student credentials in Vercel environment variables. Redeploy after adding it.

The endpoint is the public deployment listed by [the ET Lab API repository](https://github.com/devadathanmb/rit-etlab-api). ET Lab credentials entered during signup will be transmitted through APMS to that service for verification. The college should ensure its approval covers that destination. The service is unofficial, relies on scraping, and may be unavailable or break if ET Lab changes. For a wider rollout, host a reviewed copy under an account controlled by the college or APMS team and set the variable to its HTTPS origin.

## Signup behavior

1. Student enters KTU registration number and ET Lab credentials.
2. APMS verifies credentials and matches the registration number returned by the ET Lab profile.
3. Student enters contact and academic details and sets an APMS password.
4. APMS submits the student account as pending faculty approval.
5. Student signs in later using the APMS password after approval.
