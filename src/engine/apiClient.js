import { Capacitor } from '@capacitor/core'

const rawApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function getApiBaseUrl() {
  if (!rawApiBaseUrl) return ''

  try {
    const url = new URL(rawApiBaseUrl)
    if (isNativeApp() && url.protocol !== 'https:') return ''
    return trimTrailingSlash(url.toString())
  } catch {
    return ''
  }
}

export function hasApiProxy() {
  return Boolean(getApiBaseUrl()) || import.meta.env.DEV
}

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path
  if (!path.startsWith('/')) throw new Error(`API path must begin with "/": ${path}`)

  const baseUrl = getApiBaseUrl()
  if (baseUrl) return `${baseUrl}${path}`
  if (isNativeApp()) {
    throw new Error('iOS production API is not configured. Set VITE_API_BASE_URL to your HTTPS Vercel API domain before building.')
  }
  return path
}

export function apiFetch(path, options) {
  return Promise.resolve().then(() => fetch(apiUrl(path), options))
}
