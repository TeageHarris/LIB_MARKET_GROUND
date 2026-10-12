// src/lib/api.ts
// Fetch wrapper for the LIB_MARKET_GROUND backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: { ...authHeader(token) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const API_BASE = API_URL;