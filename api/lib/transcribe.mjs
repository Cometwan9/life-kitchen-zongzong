import { ProxyAgent, fetch as undiciFetch } from 'undici'

const DEFAULT_PROMPT =
  '这是一段中文日程倾诉录音。请忠实转写成纯文本，保留原意与口语，不要总结、不要翻译、不要加标点以外的解释。只输出转写正文。'

function geminiApiBase() {
  return String(process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')
}

function geminiModel() {
  return process.env.GEMINI_TRANSCRIBE_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-latest'
}

function proxyUrl() {
  return process.env.GEMINI_HTTPS_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
}

function getFetch() {
  const proxy = proxyUrl()
  if (!proxy) return globalThis.fetch.bind(globalThis)
  const agent = new ProxyAgent(proxy)
  return (url, options = {}) => undiciFetch(url, { ...options, dispatcher: agent })
}

export function transcribeConfigured() {
  return Boolean(String(process.env.GEMINI_API_KEY || '').trim())
}

function normalizeMimeType(mimeType = '') {
  const raw = String(mimeType || '').split(';')[0].trim().toLowerCase()
  if (!raw) return 'audio/wav'
  if (raw === 'audio/mp4' || raw === 'audio/m4a' || raw === 'audio/x-m4a') return 'audio/mp4'
  if (raw === 'audio/webm') return 'audio/webm'
  if (raw === 'audio/mpeg' || raw === 'audio/mp3') return 'audio/mp3'
  if (raw === 'audio/ogg' || raw === 'audio/ogg;codecs=opus') return 'audio/ogg'
  if (raw === 'audio/wav' || raw === 'audio/wave' || raw === 'audio/x-wav') return 'audio/wav'
  if (raw === 'audio/aac') return 'audio/aac'
  if (raw === 'audio/flac') return 'audio/flac'
  return raw.startsWith('audio/') ? raw : 'audio/wav'
}

function extractText(payload = {}) {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .map((part) => String(part?.text || ''))
    .join('')
    .replace(/^```(?:\w+)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function readGeminiError(payload = {}, status = 500) {
  const message =
    payload?.error?.message ||
    payload?.message ||
    (typeof payload === 'string' ? payload : '') ||
    `Gemini 转写失败 ${status}`
  return String(message)
}

/**
 * @param {{ audioBase64: string, mimeType?: string, prompt?: string }} input
 * @returns {Promise<{ text: string, model: string, provider: string }>}
 */
export async function transcribeWithGemini(input = {}) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim()
  if (!apiKey) {
    const error = new Error('语音转写未配置：请在服务端设置 GEMINI_API_KEY。')
    error.status = 503
    error.code = 'transcribe_not_configured'
    throw error
  }

  const audioBase64 = String(input.audioBase64 || '').replace(/\s+/g, '')
  if (!audioBase64) {
    const error = new Error('没有录到声音')
    error.status = 400
    error.code = 'empty_audio'
    throw error
  }

  if (audioBase64.length > 20_000_000) {
    const error = new Error('这段录音太长了，先短一点说。')
    error.status = 413
    error.code = 'audio_too_large'
    throw error
  }

  const mimeType = normalizeMimeType(input.mimeType)
  const model = geminiModel()
  const prompt = String(input.prompt || DEFAULT_PROMPT).slice(0, 2000)
  const endpoint = `${geminiApiBase()}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const doFetch = getFetch()

  const upstream = await doFetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048,
      },
    }),
  })

  const payload = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    const error = new Error(readGeminiError(payload, upstream.status))
    error.status = upstream.status === 401 || upstream.status === 403 ? 401 : upstream.status >= 500 ? 502 : 400
    error.code = 'gemini_upstream_error'
    error.detail = payload
    throw error
  }

  const text = extractText(payload)
  if (!text) {
    const error = new Error('没有听清楚，可以再说一次')
    error.status = 422
    error.code = 'empty_transcript'
    throw error
  }

  return {
    text,
    model,
    provider: 'gemini',
  }
}
