/**
 * Map a clicked control to a tavern SFX id.
 * Scheme 2: everyday clicks → bubble (via tap/confirm); keep enter / bell / success;
 * brew-start controls use data-sfx="off" and play `mix` from start().
 * @param {Element | null | undefined} target
 * @returns {'tap'|'confirm'|'enter'|'bell'|'success'|null}
 */
export function resolveButtonSfx(target) {
  if (!target || typeof target.closest !== 'function') return null

  const btn = target.closest('button, a[href], [role="button"]')
  if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return null
  if (btn.dataset?.sfx === 'off') return null

  const className = String(btn.className || '')
  const aria = btn.getAttribute('aria-label') || ''
  const text = String(btn.textContent || '').replace(/\s+/g, ' ').trim()

  if (className.includes('service-bell') || className.includes('service-bell-action')) {
    return 'bell'
  }

  if (
    className.includes('task-complete-check')
    || /做完了|确认出杯|开新的一天/.test(text)
    || (className.includes('result-final-btn') && className.includes('is-ready'))
  ) {
    return 'success'
  }

  if (
    (className.includes('start-spell') && className.includes('primary'))
    || aria.includes('进入酒馆')
  ) {
    return 'enter'
  }

  if (className.includes('btn-primary')) {
    return 'confirm'
  }

  if (
    className.includes('btn-ghost')
    || className.includes('top-icon-btn')
    || className.includes('setting-card')
    || className.includes('start-spell')
    || className.includes('guest-edge-pull')
    || className.includes('guest-name-button')
    || className.includes('language-choice-list')
    || btn.closest('.tavern-bottom-nav')
    || btn.closest('.intro-actions')
    || btn.closest('.btn-row')
    || btn.closest('.adventure-actions')
  ) {
    return 'tap'
  }

  if (btn.tagName === 'BUTTON') return 'tap'
  return null
}
