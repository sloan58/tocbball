const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Get admin PIN from localStorage
 */
export function getAdminPin(teamId: string): string | null {
  if (typeof window === 'undefined') return null
  const key = `adminPin_${teamId}`
  return localStorage.getItem(key)
}

/**
 * Set admin PIN in localStorage
 */
export function setAdminPin(teamId: string, pin: string): void {
  if (typeof window === 'undefined') return
  const key = `adminPin_${teamId}`
  localStorage.setItem(key, pin)
}

/**
 * Clear admin PIN from localStorage
 */
export function clearAdminPin(teamId: string): void {
  if (typeof window === 'undefined') return
  const key = `adminPin_${teamId}`
  localStorage.removeItem(key)
}

/**
 * Get headers with admin PIN if available
 */
export function getHeaders(teamId: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  const pin = getAdminPin(teamId)
  if (pin) {
    headers['X-Admin-PIN'] = pin
  }
  return headers
}

/**
 * Fetch with admin PIN header
 */
export async function fetchWithAuth(
  url: string,
  teamId: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...getHeaders(teamId),
    ...options.headers,
  }
  return fetch(url, { ...options, headers })
}
