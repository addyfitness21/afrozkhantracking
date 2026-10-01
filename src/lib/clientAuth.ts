'use client';

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('fitpulse_session_token');
}

export function getSessionUser(): { id: string; name: string; role: 'USER' | 'ADMIN' } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('fitpulse_session_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveTabSession(token: string, user: { id: string; name: string; role: 'USER' | 'ADMIN' }) {
  if (typeof window === 'undefined') return;
  // Session storage is STRICTLY isolated to this tab only
  sessionStorage.setItem('fitpulse_session_token', token);
  sessionStorage.setItem('fitpulse_session_user', JSON.stringify(user));
  // Wipe any cross-tab localStorage leaks
  try {
    localStorage.removeItem('fitpulse_user');
  } catch (e) {}
}

export function clearTabSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('fitpulse_session_token');
  sessionStorage.removeItem('fitpulse_session_user');
  try {
    localStorage.removeItem('fitpulse_user');
  } catch (e) {}
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getSessionToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
  });
}
