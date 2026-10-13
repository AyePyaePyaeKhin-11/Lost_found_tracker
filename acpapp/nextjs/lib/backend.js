// lib/backend.js - SERVER-SIDE ONLY (imported by pages/api/* routes).
//
// BACKEND_URL:
//   - docker compose (default): http://backend-api:8000  (the compose service name)
//   - running `npm run dev` outside Docker: create nextjs/.env.local with
//       BACKEND_URL=http://127.0.0.1:8000
export const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-api:8000';

// Loads the caller's items from FastAPI, forwarding THEIR login token
// (GET /api/items requires it and only returns the caller's organization).
// Returns the items array, or null after sending an error response.
export async function fetchItemsFromBackend(req, res) {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: 'Login required' });
    return null;
  }

  const backendRes = await fetch(`${BACKEND_URL}/api/items`, {
    headers: { Authorization: auth },
  });

  if (!backendRes.ok) {
    const details = await backendRes.text();
    res.status(backendRes.status).json({
      error: `Backend returned status ${backendRes.status}`,
      details,
    });
    return null;
  }

  return backendRes.json();
}
