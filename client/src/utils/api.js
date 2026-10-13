// Centralized API client for APMS
// Automatically attaches the JWT token to every request

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('apms_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('We could not reach APMS. Check your connection and try again.');
  }

  // Safely parse JSON — empty body or non-JSON means server is unreachable/crashed
  let data = {};
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { throw new Error('Server returned an invalid response. Is the backend running?'); }
  }

  if (res.status === 401 && token && path !== '/auth/login') {
    localStorage.removeItem('apms_token');
    localStorage.removeItem('apms_user');
    window.dispatchEvent(new Event('apms-session-ended'));
  }
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  setToken: (token) => {
    if (token) localStorage.setItem('apms_token', token);
    else localStorage.removeItem('apms_token');
  },
  getToken,
};

