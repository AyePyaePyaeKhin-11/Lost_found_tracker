// lib/api.js - browser-side helpers.
// The JWT is kept in localStorage under "token" (register.js already uses this key).

export function getToken() {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

export function saveSession({ token, email, role }) {
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    if (role) localStorage.setItem('role', role);
  } catch {}
}

export function logout() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
  } catch {}
}

// fetch() that automatically sends "Authorization: Bearer <token>".
// If the backend answers 401 (missing/expired token) the user is sent to /login.
export async function authFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    logout();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
  return res;
}
