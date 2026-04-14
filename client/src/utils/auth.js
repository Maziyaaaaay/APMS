// auth.js — API-backed authentication (replaces localStorage version)
import { api } from './api.js';

// Decode JWT payload without verification (safe — server verified it)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export async function login(username, password, role) {
  try {
    const { token, user } = await api.post('/auth/login', { username, password, role });
    api.setToken(token);
    localStorage.setItem('apms_user', JSON.stringify(user));
    return { success: true, user };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export async function signup(userData) {
  try {
    const result = await api.post('/auth/signup', userData);
    return { success: true, user: result.user };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export function logout() {
  api.setToken(null);
  localStorage.removeItem('apms_user');
}

export function getCurrentUser() {
  const token = api.getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  // Check token hasn't expired
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    logout();
    return null;
  }
  const userStr = localStorage.getItem('apms_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function requireAuth(role) {
  const user = getCurrentUser();
  if (!user) return false;
  if (role && user.role !== role) return false;
  return true;
}
