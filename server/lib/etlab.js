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
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(22_000) });
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
  const login = await apiRequest(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (login.response.status === 401 || login.response.status === 403) {
    throw new EtlabError('invalid_credentials', 'ET Lab username or password was not accepted.', 401);
  }
  if (!login.response.ok || typeof login.body?.token !== 'string' || !login.body.token || login.body.token.length > 4096) {
    throw new EtlabError('unavailable', 'ET Lab could not verify those details right now. Please try again later.', 502);
  }

  // The ET Lab session token is used only for this profile request and is never returned or saved.
  const profile = await apiRequest(`${baseUrl}/api/profile`, {
    method: 'GET',
    headers: { Authorization: login.body.token, Accept: 'application/json' },
  });
  if (profile.response.status === 401 || profile.response.status === 403) {
    throw new EtlabError('session_expired', 'ET Lab verification expired. Please try again.', 401);
  }
  const details = profile.body?.profile_details;
  const verifiedRegistrationNo = normalizeRegistrationNumber(details?.university_roll_no);
  const verifiedName = typeof details?.name === 'string' ? details.name.trim() : '';
  if (!profile.response.ok || !verifiedRegistrationNo || !verifiedName || verifiedName.length > 150) {
    throw new EtlabError('profile_unavailable', 'ET Lab did not return the required student identity details.', 502);
  }
  if (verifiedRegistrationNo !== normalizeRegistrationNumber(registrationNo)) {
    throw new EtlabError('registration_mismatch', 'The ET Lab profile does not match the KTU registration number entered.', 403);
  }

  const proof = jwt.sign({
    purpose: 'student_signup',
    registrationNo: verifiedRegistrationNo,
    name: verifiedName,
  }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: VERIFY_AUDIENCE,
    issuer: VERIFY_ISSUER,
    expiresIn: VERIFY_TTL_SECONDS,
  });

  return { name: verifiedName, registrationNo: verifiedRegistrationNo, proof };
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
