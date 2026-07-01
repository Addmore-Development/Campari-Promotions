const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('hg_token')
  const isFormData = options.body instanceof FormData

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed (${res.status})`)
  }

  return res.json()
}

export function apiUpload(path: string, formData: FormData): Promise<any> {
  const token = localStorage.getItem('hg_token')
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then(r => r.json())
}

export const API_BASE_URL = API_BASE