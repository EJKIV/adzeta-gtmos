// Backend URL - defaults to Next.js API routes if no external backend
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const USE_NEXT_API = !BACKEND_URL || BACKEND_URL.includes('localhost:3001');

/**
 * Fetch JSON from backend or fall back to Next.js API routes
 */
export async function fetchJson<T>(path: string): Promise<T> {
  const url = USE_NEXT_API 
    ? `/api${path}`
    : `${BACKEND_URL}${path}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: USE_NEXT_API ? 'same-origin' : 'include',
    });

    if (!response.ok) {
      // Try Next.js API fallback
      if (!USE_NEXT_API) {
        console.warn(`Backend unavailable, trying Next.js API: /api${path}`);
        return fetchJsonFromNextApi<T>(path);
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    // Fall back to Next.js API routes on failure
    if (!USE_NEXT_API) {
      console.warn(`Backend error, falling back to Next.js API: ${path}`);
      return fetchJsonFromNextApi<T>(path);
    }
    throw error;
  }
}

/**
 * Fetch from Next.js API routes
 */
async function fetchJsonFromNextApi<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`API Error: HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Post JSON to backend
 */
export async function postJson<T>(path: string, data: unknown): Promise<T> {
  const url = USE_NEXT_API
    ? `/api${path}`
    : `${BACKEND_URL}${path}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: USE_NEXT_API ? 'same-origin' : 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
