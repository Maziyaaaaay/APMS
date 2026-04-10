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
  if (res.user) {
      localStorage.setItem('apms_user', JSON.stringify(res.user));
  }
  return res.user || res;
}

export async function deleteUser(id) {
  return api.delete(`/users/${id}`);
}

// ─── Certificates ────────────────────────────────────────────────────────────
export async function getCertificates() {
  return api.get('/certificates');
}

export async function getCertificatesByStudent(studentId) {
  // Server already filters by student when logged in as student
  return api.get('/certificates');
}

export async function getPendingCertificates() {
  const certs = await api.get('/certificates');
  return certs.filter(c => c.status === 'pending');
}

export async function addCertificate(cert) {
  return api.post('/certificates', {
    activityId: cert.activityId,
    levelSelected: cert.levelSelected,
    hours: cert.hours,
    description: cert.description,
    fileUrl: cert.fileUrl,
    pointsAwarded: cert.pointsAwarded,
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

export async function saveDepartments(_depts) {
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
  return api.post('/circulars', { title: circular.title, content: circular.content });
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
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const text = await res.text();
  let data = {};
  if (text) { try { data = JSON.parse(text); } catch {} }
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  return data;
}

// ─── Promote to Admin (super admin only) ─────────────────────────────────────
export async function promoteToAdmin(userId) {
  return api.patch(`/users/${userId}/role`, { role: 'admin' });
}

