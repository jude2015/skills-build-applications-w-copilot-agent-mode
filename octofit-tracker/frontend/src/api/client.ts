// Relative /api paths go through the Vite dev proxy, so port 8000 never needs to be public.
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl}${path}`;
  const response = init ? await fetch(url, init) : await fetch(url);

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'Request failed' }));
    const message = typeof payload?.message === 'string' ? payload.message : `Request failed with ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status });
  }

  return response.json() as Promise<T>;
}

export async function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}
