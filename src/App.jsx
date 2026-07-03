import { useStore, STEPS } from './store/store.jsx'
import { useEffect, useRef, useState } from 'react'
import { pushPetState, startActionPoll, stopActionPoll, onPetAction } from './engine/petBridge.js'
import { recordEvent } from './engine/cellarApi.js'
import LoginPage from './pages/LoginPage.jsx'
import IntroPage from './pages/IntroPage.jsx'
import GuestProfilePage from './pages/GuestProfilePage.jsx'
import BartenderPage from './pages/BartenderPage.jsx'
import TodoPage from './pages/TodoPage.jsx'
import OptimizePage from './pages/OptimizePage.jsx'
import ExecutePage from './pages/ExecutePage.jsx'
import RevealPage from './pages/RevealPage.jsx'
import OpsPage from './pages/OpsPage.jsx'
import stepSummonIcon from '../assets/step-icons/step-1-summon.png'
import stepChatIcon from '../assets/step-icons/step-2-chat.png'
import stepRecipeIcon from '../assets/step-icons/step-3-recipe.png'
import stepMixIcon from '../assets/step-icons/step-4-mix.png'
import stepRevealIcon from '../assets/step-icons/step-5-reveal.png'

const STEP_META = {
  bartender: { label: '召唤种种', hint: '空杯待命', icon: 'empty-cup', image: stepSummonIcon },
  todos: { label: '吧台聊聊', hint: '说说今天的事', icon: 'filled-cup', image: stepChatIcon },
  optimize: { label: '调配酒单', hint: '排好处理顺序', icon: 'receipt', image: stepRecipeIcon },
  execute: { label: '精灵调配', hint: '种种施一点魔法', icon: 'wand', image: stepMixIcon },
  reveal: { label: '生成饮品', hint: '今日特调完成', icon: 'drink', image: stepRevealIcon },
}

const PAGES = {
  bartender: BartenderPage,
  todos: TodoPage,
  optimize: OptimizePage,
  execute: ExecutePage,
  reveal: RevealPage,
}

export default function App() {
  const { state, dispatch } = useStore()
  const isOpsPage = window.location.pathname === '/ops'
  const [introStage, setIntroStage] = useState('intro')
  const [pendingStartMode, setPendingStartMode] = useState('full')
  const bartenderReadyAt = useRef(0)
  const Page = PAGES[state.step] || BartenderPage
  const curIdx = STEPS.indexOf(state.step)
  const showFlow = state.step !== 'bartender'
  const selectedCustomBartender = state.customBartenders?.find((b) => b.id === state.lockedBartenderId)

  useEffect(() => {
    const handler = (event) => {
      const target = event.target?.closest?.('button,a,[role="button"]')
      if (!target) return
      const label = target.getAttribute('aria-label') || target.textContent || target.className || 'tap'
      recordEvent({
        type: 'click',
        label: String(label).replace(/\s+/g, ' ').trim().slice(0, 80),
        page: isOpsPage ? 'ops' : state.step || introStage,
        userId: state.authUser?.id || state.userProfile?.id || '',
      }).catch(() => {})
    }
    window.addEventListener('click', handler, { capture: true })
    return () => window.removeEventListener('click', handler, { capture: true })
  }, [introStage, isOpsPage, state.authUser?.id, state.step, state.userProfile?.id])

  if (isOpsPage) return <OpsPage />

  const openGuestProfile = () => {
    dispatch({ type: 'SET_WORKFLOW_MODE', mode: 'full' })
    setIntroStage('guest')
  }

  const startIntro = (mode = 'full', authenticated = false) => {
    if (!authenticated && (!state.authToken || !state.authUser)) {
      setPendingStartMode(mode)
      setIntroStage('login')
      return
    }
    dispatch({ type: 'SET_WORKFLOW_MODE', mode })
    if (mode === 'quick') {
      const id = state.lockedBartenderId || state.bartenderId || 'lemon'
      if (!state.lockedBartenderId) dispatch({ type: 'SET_BARTENDER', id })
      dispatch({ type: 'SET_ASSISTANT_MODE', mode: 'daily' })
      dispatch({ type: 'GO', step: 'todos' })
    } else {
      dispatch({ type: 'GO', step: 'bartender' })
    }
    setIntroStage('app')
  }

  useEffect(() => {
    if (introStage === 'app' && state.step === 'bartender') {
      bartenderReadyAt.current = Date.now()
    }
  }, [introStage, state.step])

  useEffect(() => {
    if (introStage !== 'app') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [introStage, state.step])

  // 一旦选定小精灵，在静态页面也保持桌宠形象同步，避免它回到默认色。
  // 酒单页会自己推送调配/倒计时状态，所以这里不抢它的同步。
  useEffect(() => {
    if (!state.lockedBartenderId || state.step === 'execute' || state.step === 'optimize' || state.step === 'bartender') return
    const idle = { state: 'idle', bartenderId: state.lockedBartenderId, selected: true, schedule: [], customBartender: selectedCustomBartender }
    pushPetState(idle)
    const t = setInterval(() => pushPetState(idle), 5000)
    return () => clearInterval(t)
  }, [state.lockedBartenderId, state.step, selectedCustomBartender])

  useEffect(() => {
    if (introStage !== 'app') return undefined
    startActionPoll()
    const off = onPetAction((action) => {
      if (action.type !== 'select-bartender' || !action.bartenderId) return
      if (state.step !== 'bartender') return
      if (!action.selectedAt || action.selectedAt < bartenderReadyAt.current) return
      const customBartender = state.customBartenders?.find((b) => b.id === action.bartenderId)
      dispatch({ type: 'SET_BARTENDER', id: action.bartenderId })
      dispatch({ type: 'GO', step: 'todos' })
      pushPetState({ state: 'idle', bartenderId: action.bartenderId, selected: true, schedule: [], customBartender })
    })
    return () => {
      off()
      stopActionPoll()
    }
  }, [dispatch, introStage, state.step, state.customBartenders])

  if (introStage === 'intro') return <IntroPage onQuickStart={() => startIntro('quick')} onFullStart={() => startIntro('full')} />
  if (introStage === 'login') return <LoginPage onAuthenticated={() => startIntro(pendingStartMode, true)} />
  if (!state.authToken || !state.authUser) return <LoginPage onAuthenticated={() => setIntroStage('intro')} />
  if (introStage === 'guest') return <GuestProfilePage onStart={startIntro} />

  return (
    <div className={`app step-${state.step}`}>
      {showFlow && (
        <div className="topbar">
          <div className="brand">
            Life Kitchen
          </div>
        </div>
      )}

      {showFlow && (
        <div className="steps brew-path" aria-label="饮品生成流程">
          {STEPS.map((s, i) => {
            const meta = STEP_META[s]
            const stepState = s === state.step ? 'current' : i < curIdx ? 'passed' : 'upcoming'
            return (
            <div key={s} className={`brew-step-wrap ${stepState}`}>
              <span className={`step-dot ${s === state.step ? 'active' : i < curIdx ? 'done' : ''}`} aria-current={s === state.step ? 'step' : undefined}>
                <span className={`step-icon ${meta.icon} ${meta.image ? 'has-art' : ''}`} aria-hidden="true">
                  {meta.image ? <img src={meta.image} alt="" /> : <span className="step-icon-part" />}
                </span>
                <span className="step-label">{meta.label}</span>
                <span className="step-hint">{meta.hint}</span>
              </span>
              {i < STEPS.length - 1 && <span className="brew-arrow" aria-hidden="true" />}
            </div>
          )})}
        </div>
      )}

      <Page />
    </div>
  )
}
