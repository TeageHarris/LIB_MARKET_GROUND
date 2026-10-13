// src/lib/auth.ts
// Client-side auth helper — stores the JWT in localStorage

'use client';

const TOKEN_KEY = 'lmg_token';
const USER_KEY = 'lmg_user';

export type AuthUser = {
  id: number;
  email: string;
  phone: string;
  full_name: string;
  role: 'buyer' | 'vendor_owner' | 'admin';
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
};

export function saveAuth(token: string, user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}