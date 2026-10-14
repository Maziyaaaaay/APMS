// auth.js — API-backed authentication (replaces localStorage version)
import { api } from './api.js';

// Decode JWT payload without verification (safe — server verified it)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function supabaseAuthRequest(path, body) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Email confirmation is not configured yet. Please contact the APMS administrator.');
  }
  const response = await fetch(supabaseUrl + '/auth/v1/' + path, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'Could not send the confirmation email.');
  return data;
}

export async function signup(userData) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, message: 'Email confirmation is not configured yet. Please contact the APMS administrator.' };
    }
    const result = await api.post('/auth/signup', userData);
    try {
      const redirectTo = window.location.origin + '/auth/confirm';
      const authResult = await supabaseAuthRequest('signup?redirect_to=' + encodeURIComponent(redirectTo), {
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
      });
      if (authResult.session) {
        return { success: false, message: 'Email confirmation is disabled in Supabase. The administrator must enable email confirmations before signup can continue.' };
      }
      return { success: true, user: result.user, confirmationSent: true };
    } catch (emailError) {
      return { success: true, user: result.user, confirmationSent: false, message: emailError.message };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
}

export async function resendSignupConfirmation(email) {
  const redirectTo = window.location.origin + '/auth/confirm';
  return supabaseAuthRequest('resend?redirect_to=' + encodeURIComponent(redirectTo), {
    type: 'signup',
    email: email.trim().toLowerCase(),
  });
}

export async function confirmSignupEmail(accessToken) {
  return api.post('/auth/confirm-email', { accessToken });
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

