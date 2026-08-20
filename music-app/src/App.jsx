import { useState } from 'react'
import './index.css'
import AudioEngine from './components/AudioEngine'
import Player from './components/Player'
import HomePage from './pages/HomePage'
import ArtistsPage from './pages/ArtistsPage'
import YouTubePage from './pages/YouTubePage'

const TABS = [
  { id: 'trending', label: 'Trending' },
  { id: 'artists',  label: 'Artists'  },
  { id: 'youtube',  label: 'YT'       },
]

export default function App() {
  const [tab, setTab] = useState('trending')

  return (
    <div className="app">
      {/* Hidden audio engine */}
      <AudioEngine />

      {/* Header */}
      <header className="header">
        <div className="header-logo">यादें <span>Music</span></div>
        <nav className="nav-tabs" aria-label="Main navigation">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`nav-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Pages */}
      {tab === 'trending' && <HomePage />}
      {tab === 'artists'  && <ArtistsPage />}
      {tab === 'youtube'  && <YouTubePage />}

      {/* Persistent bottom player */}
      <Player />
    </div>
  )
}
