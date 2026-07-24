import bubbleUrl from '../../assets/audio/sfx-bubble.wav'
import enterUrl from '../../assets/audio/sfx-enter.wav'
import bellUrl from '../../assets/audio/sfx-bell.wav'
import successUrl from '../../assets/audio/sfx-success.wav'
import mixUrl from '../../assets/audio/sfx-mix.wav'
import { resolveButtonSfx } from './sfxResolve.js'

export { resolveButtonSfx }

const SFX_ATTR = 'data-tavern-sfx'

/** @type {Record<string, { url: string, volume: number }>} */
const SFX = {
  // Scheme 2: bubble is the default click voice (covers former tap + confirm).
  tap: { url: bubbleUrl, volume: 0.4 },
  confirm: { url: bubbleUrl, volume: 0.42 },
  bubble: { url: bubbleUrl, volume: 0.4 },
  enter: { url: enterUrl, volume: 0.58 },
  bell: { url: bellUrl, volume: 0.6 },
  success: { url: successUrl, volume: 0.55 },
  mix: { url: mixUrl, volume: 0.5 },
}

/** @type {Record<string, HTMLAudioElement[]>} */
const pool = {}

function borrowAudio(id) {
  const cfg = SFX[id]
  if (!cfg) return null
  const list = pool[id] || (pool[id] = [])
  const free = list.find((audio) => audio.paused || audio.ended)
  if (free) return free

  const audio = new window.Audio(cfg.url)
  audio.preload = 'auto'
  audio.volume = cfg.volume
  audio.setAttribute(SFX_ATTR, id)
  audio.setAttribute('aria-hidden', 'true')
  audio.hidden = true
  list.push(audio)
  return audio
}

/**
 * @param {'tap'|'confirm'|'bubble'|'enter'|'bell'|'success'|'mix'} id
 */
export function playUiSound(id) {
  if (typeof window === 'undefined' || !SFX[id]) return false
  const cfg = SFX[id]
  const audio = borrowAudio(id)
  if (!audio) return false

  try {
    audio.pause()
    audio.currentTime = 0
    audio.volume = cfg.volume
    void audio.play()
    return true
  } catch {
    return false
  }
}
