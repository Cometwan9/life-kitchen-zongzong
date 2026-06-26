import { useState } from 'react'
import tavernPanorama from '../../assets/hero/life-kitchen-tavern-panorama.png'

export default function IntroPage({ onStart }) {
  const [entering, setEntering] = useState(false)

  const enterTavern = () => {
    if (entering) return
    setEntering(true)
    window.setTimeout(onStart, 360)
  }

  return (
    <main className={`intro-page ${entering ? 'is-entering' : ''}`}>
      <div className="intro-sigil" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="intro-logo" aria-label="Life Kitchen">
        <span className="logo-hat" aria-hidden="true" />
        <span className="logo-wing left" aria-hidden="true" />
        <span className="logo-wing right" aria-hidden="true" />
        <span className="logo-star s1" aria-hidden="true" />
        <span className="logo-star s2" aria-hidden="true" />
        <span className="logo-star s3" aria-hidden="true" />
        <h1 className="intro-title">
          <span>Life</span>
          <span>Kitchen</span>
        </h1>
      </div>

      <figure className="intro-tavern-portrait" aria-label="Life Kitchen 像素风魔法酒馆全景">
        <img className="tavern-bg" src={tavernPanorama} alt="像素风魔法酒馆里的种种们" draggable="false" />
      </figure>

      <div className="intro-actions">
        <button className="start-spell" onClick={enterTavern} aria-label="进入酒馆">
          <span>进入酒馆</span>
        </button>
      </div>

      <div className="intro-door-wipe" aria-hidden="true">
        <span className="intro-door left" />
        <span className="intro-door right" />
        <span className="intro-door-light" />
      </div>
    </main>
  )
}
