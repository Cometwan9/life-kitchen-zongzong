import { apiFetch } from './apiClient.js'

async function readErrorMessage(res) {
  const raw = await res.text().catch(() => '')
  if (!raw) return ''
  try {
    const data = JSON.parse(raw)
    return data.error?.message || data.message || raw
  } catch {
    return raw
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('录音读取失败'))
    reader.readAsDataURL(blob)
  })
}

export async function transcribeAudio(blob) {
  if (!blob || blob.size === 0) throw new Error('没有录到声音')

  const audioBase64 = await blobToBase64(blob)
  const mimeType = blob.type || 'audio/webm'

  const res = await apiFetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType,
      prompt: '这是一段中文日程倾诉，请忠实转写用户说的话。只输出转写正文。',
    }),
  })

  if (!res.ok) {
    const message = await readErrorMessage(res)
    if (res.status === 401) throw new Error('语音 API key 没配好，请检查服务端 GEMINI_API_KEY。')
    if (res.status === 404) throw new Error('语音转写接口没有接上，请检查 /api/transcribe。')
    if (res.status === 413) throw new Error('这段录音太长了，先短一点说。')
    if (res.status === 503) throw new Error(message || '语音转写未配置：请在服务端设置 GEMINI_API_KEY。')
    throw new Error(message || `语音转写失败 ${res.status}`)
  }

  const data = await res.json()
  const text = data.text || data.transcript || ''
  if (!text.trim()) throw new Error('没有听清楚，可以再说一次')
  return text.trim()
}
