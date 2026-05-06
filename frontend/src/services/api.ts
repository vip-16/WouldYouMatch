/**
 * WouldYouMatch? Centralized API & WebSocket Configuration
 * Dynamically resolves URLs for both local development and production deployments.
 */

const env = (import.meta as any).env || {};

// In development, fallback to http://localhost:8000.
// When deployed (e.g. Vercel, Netlify, Render, Railway), configure VITE_API_URL.
export const API_BASE: string = (env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const getAuthToken = (): string | null => {
  try {
    return (
      localStorage.getItem('wouldyoumatch_auth_token') ||
      localStorage.getItem('wyrmg_auth_token') ||
      sessionStorage.getItem('wyrmg_auth_token')
    );
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string) => {
  try {
    localStorage.setItem('wouldyoumatch_auth_token', token);
    localStorage.setItem('wyrmg_auth_token', token);
    sessionStorage.setItem('wyrmg_auth_token', token);
  } catch {
    /* storage unavailable */
  }
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem('wouldyoumatch_auth_token');
    localStorage.removeItem('wyrmg_auth_token');
    sessionStorage.removeItem('wyrmg_auth_token');
  } catch {
    /* noop */
  }
};

export const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
};

export const apiFetch = (path: string, init: RequestInit = {}): Promise<Response> => {
  const headers = authHeaders({ 'Content-Type': 'application/json', ...((init.headers as Record<string, string>) || {}) });
  return fetch(`${API_BASE}${path}`, { ...init, headers });
};

// Derives WebSocket URL automatically based on protocol (ws:// or wss://)
export const getWsUrl = (ticket?: string): string => {
  if (env.VITE_WS_URL) {
    const base = env.VITE_WS_URL.replace(/\/$/, '');
    return ticket ? `${base}/ws?ticket=${ticket}` : `${base}/ws`;
  }

  // Derive from API_BASE
  try {
    const parsed = new URL(API_BASE);
    const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = parsed.host;
    return ticket ? `${wsProto}//${host}/ws?ticket=${ticket}` : `${wsProto}//${host}/ws`;
  } catch {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'localhost:8000' : (typeof window !== 'undefined' ? window.location.host : 'localhost:8000');
    return ticket ? `${wsProto}//${host}/ws?ticket=${ticket}` : `${wsProto}//${host}/ws`;
  }
};
