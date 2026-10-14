import jwt from 'jsonwebtoken';

const VERIFY_AUDIENCE = 'apms-etlab-student-signup';
const VERIFY_ISSUER = 'ktu-apms';
const VERIFY_TTL_SECONDS = 10 * 60;

export class EtlabError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'EtlabError';
    this.code = code;
    this.status = status;
  }
}

export function normalizeRegistrationNumber(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : '';
}

function getApiBaseUrl() {
  const raw = process.env.ETLAB_API_BASE_URL?.trim();
  if (!raw) {
    throw new EtlabError('not_configured', 'ET Lab verification is not configured yet. Contact the APMS administrator.', 503);
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new EtlabError('not_configured', 'ET Lab verification is not configured correctly. Contact the APMS administrator.', 503);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) {
    throw new EtlabError('not_configured', 'ET Lab verification URL must be a trusted HTTPS service origin. Contact the APMS administrator.', 503);
  }
  return parsed.origin;
}

async function apiRequest(url, options) {
  let response;
  try {
    // The public Render deployment may need time to wake from its idle state.
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(55_000) });
  } catch {
    throw new EtlabError('unavailable', 'ET Lab verification is temporarily unavailable. Please try again shortly.', 502);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new EtlabError('unavailable', 'ET Lab verification returned an unreadable response. Please try again later.', 502);
  }
  return { response, body };
}

export async function verifyEtlabStudent({ username, password, registrationNo }) {
  const baseUrl = getApiBaseUrl();
  const sharedSecret = process.env.ETLAB_VERIFIER_SHARED_SECRET?.trim();
  if (!sharedSecret || sharedSecret.length < 32) {
    throw new EtlabError('not_configured', 'ET Lab verification is not configured yet. Contact the APMS administrator.', 503);
  }

  const expectedRegistrationNo = normalizeRegistrationNumber(registrationNo);
  const verification = await apiRequest(`${baseUrl}/api/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-APMS-Verification-Key': sharedSecret,
    },
    body: JSON.stringify({ username, password, registrationNo: expectedRegistrationNo }),
  });
  if (verification.response.status === 401) {
    // The verifier uses 401 for both a bad shared key and rejected ET Lab
    // credentials. Only the explicit error code means the student login failed.
    if (verification.body?.error === 'invalid_credentials') {
      throw new EtlabError('invalid_credentials', 'ET Lab username or password was not accepted.', 401);
    }
    throw new EtlabError('verifier_unauthorized', 'ET Lab verification is not connected correctly. Contact the APMS administrator.', 503);
  }
  if (verification.response.status === 403) {
    throw new EtlabError('registration_mismatch', 'The COET ET Lab profile does not match the KTU registration number entered.', 403);
  }
  if (verification.response.status === 429) {
    throw new EtlabError('rate_limited', 'Too many ET Lab verification attempts. Please wait a minute and try again.', 429);
  }
  const verifiedName = typeof verification.body?.name === 'string' ? verification.body.name.trim() : '';
  if (!verification.response.ok || verification.body?.verified !== true || !verifiedName || verifiedName.length > 150 || !expectedRegistrationNo) {
    throw new EtlabError('unavailable', 'ET Lab could not verify those details right now. Please try again later.', 502);
  }

  const proof = jwt.sign({
    purpose: 'student_signup',
    registrationNo: expectedRegistrationNo,
    name: verifiedName,
  }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: VERIFY_AUDIENCE,
    issuer: VERIFY_ISSUER,
    expiresIn: VERIFY_TTL_SECONDS,
  });

  return { name: verifiedName, registrationNo: expectedRegistrationNo, proof };
}

export function readEtlabSignupProof(proof) {
  try {
    const claims = jwt.verify(proof, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      audience: VERIFY_AUDIENCE,
      issuer: VERIFY_ISSUER,
    });
    if (claims.purpose !== 'student_signup' || typeof claims.name !== 'string' || typeof claims.registrationNo !== 'string') return null;
    return { name: claims.name, registrationNo: claims.registrationNo };
  } catch {
    return null;
  }
}
