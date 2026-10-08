// storage.js — API-backed data layer (replaces localStorage version)
// All functions are now async and call the backend API.

import { api } from './api.js';

// ─── Init (no-op — server handles seeding) ──────────────────────────────────
export function initStorage() {
  // Nothing to do — data lives in Supabase now
}

// ─── Users ──────────────────────────────────────────────────────────────────
export async function getUsers() {
  return api.get('/users');
}

export async function getUserById(id) {
  return api.get(`/users/${id}`);
}

export async function addUser(user) {
  return api.post('/users', user);
}

export async function updateUser(user) {
  const res = await api.put(`/users/${user.id}`, user);
  if (res.token) {
      api.setToken(res.token);
  }
  if (res.token && res.user) {
      localStorage.setItem('apms_user', JSON.stringify(res.user));
  }
  return res.user || res;
}

export async function deleteUser(id) {
  return api.delete(`/users/${id}`);
}

export async function reviewAccount(id, status, note = '') {
  return api.patch(`/users/${id}/approval`, { status, note });
}

// ─── Certificates ────────────────────────────────────────────────────────────
export async function getCertificates() {
  return api.get('/certificates');
}

export async function getCertificateFileUrl(id) {
  return api.get(`/certificates/${id}/file-url`);
}

export async function getCertificatesByStudent() {
  // Server already filters by student when logged in as student
  return api.get('/certificates');
}

export async function getPendingCertificates() {
  const certs = await api.get('/certificates');
  return certs.filter(c => c.status === 'pending');
}

export async function uploadCertificate(file) {
  if (!file || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error('Choose a PDF, JPG, or PNG up to 10 MB.');
  }
  const { signedUrl, receipt } = await api.post('/certificates/upload-url', { mimeType: file.type, size: file.size });
  const body = new FormData();
  body.append('cacheControl', '3600');
  body.append('', file);
  const response = await fetch(signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error('Certificate upload failed. Check your connection and try again.');
  return receipt;
}

export async function addCertificate(cert) {
  return api.post('/certificates', {
    activityId: cert.activityId,
    levelSelected: cert.levelSelected,
    hours: cert.hours,
    description: cert.description,
    eventName: cert.eventName,
    activityDate: cert.activityDate,
    uploadReceipt: cert.uploadReceipt,
    fileUrl: cert.fileUrl,
    pointsAwarded: cert.pointsAwarded,
    fileName: cert.fileName,
  });
}

export async function updateCertificate(cert) {
  return api.put(`/certificates/${cert.id}`, {
    status: cert.status,
    pointsAwarded: cert.pointsAwarded,
    notes: cert.notes,
  });
}

export async function deleteCertificate(id) {
  return api.delete(`/certificates/${id}`);
}

// ─── Departments ─────────────────────────────────────────────────────────────
export async function getDepartments() {
  const depts = await api.get('/departments');
  return depts.map(d => d.name);
}

export async function getDepartmentsWithIds() {
  return api.get('/departments');
}

export async function saveDepartments() {
  // Old compat shim — not used with API, departments are managed via addDept/removeDept
}

export async function addDepartment(name) {
  return api.post('/departments', { name });
}

export async function removeDepartment(id) {
  return api.delete(`/departments/${id}`);
}

// ─── Circulars ───────────────────────────────────────────────────────────────
export async function getCirculars() {
  return api.get('/circulars');
}

export async function addCircular(circular) {
  return api.post('/circulars', { title: circular.title, content: circular.content, sourceUrl: circular.sourceUrl, issuedOn: circular.issuedOn });
}

export async function deleteCircular(id) {
  return api.delete(`/circulars/${id}`);
}

// ─── Point Overrides ─────────────────────────────────────────────────────────
export async function getPointOverrides() {
  return api.get('/overrides');
}

export async function savePointOverride(activityId, override) {
  return api.put(`/overrides/${activityId}`, { override });
}

export async function deletePointOverride(activityId) {
  return api.delete(`/overrides/${activityId}`);
}

// ─── Session shims (kept for backward compat — now JWT-based) ────────────────
// Use getCurrentUser from auth.js directly in components
export function setCurrentUser() {}
export function clearCurrentUser() {}

// ─── Sign Up (public — no token needed) ──────────────────────────────────────
export async function signup(userData) {
  return api.post('/auth/signup', userData);
}

// ─── Promote to Admin (super admin only) ─────────────────────────────────────
export async function promoteToAdmin(userId) {
  return api.patch(`/users/${userId}/role`, { role: 'admin' });
}

export async function changeUserRole(userId, role) {
  return api.patch(`/users/${userId}/role`, { role });
}

export async function transferOwnership(userId, password) {
  return api.post(`/users/${userId}/transfer-ownership`, { password });
}
