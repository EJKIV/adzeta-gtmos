// Backend URL - defaults to empty for Next.js API routes
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
const USE_NEXT_API = !BACKEND_URL;

/**
 * Fetch JSON from backend or Next.js API routes
 * Path should NOT start with /api - it's added automatically
 */
export async function fetchJson<T>(path: string): Promise<T> {
  // Remove leading /api if present (for backward compatibility)
  const cleanPath = path.replace(/^\/api/, '');
  
  // Build URL - no double /api
  const url = USE_NEXT_API 
    ? `/api${cleanPath}`
    : `${BACKEND_URL}${cleanPath}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: USE_NEXT_API ? 'same-origin' : 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}

/**
 * Post JSON to backend
 */
export async function postJson<T>(path: string, data: unknown): Promise<T> {
  const cleanPath = path.replace(/^\/api/, '');
  const url = USE_NEXT_API
    ? `/api${cleanPath}`
    : `${BACKEND_URL}${cleanPath}`;
  
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
