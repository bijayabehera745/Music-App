import { useState } from 'react'
import { usePlayer } from '../store'
import NowPlaying from './NowPlaying'

function fmt(s) {
  const t = Math.max(0, Math.round(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export default function Player() {
  const { queue, index, playing, progress, setPlaying, setProgress, next, prev, loading } = usePlayer()
  const [expanded, setExpanded] = useState(false)
  const track = queue[index] ?? null
  if (!track) return null

  const pct = `${(progress * 100).toFixed(1)}%`
  const dur = track.duration || 0

  return (
    <>
      {expanded && <NowPlaying onClose={() => setExpanded(false)} />}
      <div className="player">
        <input
          className="player-progress"
          type="range" min={0} max={1} step={0.001}
          value={progress}
          style={{ '--pct': pct }}
          onChange={e => {
            const el = document.querySelector('audio')
            if (el && el.duration) el.currentTime = e.target.value * el.duration
            setProgress(Number(e.target.value))
          }}
        />
        <div className="player-bar">
          {/* Art + info — tap to expand */}
          <div className="player-art" onClick={() => setExpanded(true)} style={{ cursor: 'pointer' }}>
            {track.image
              ? <img src={track.image} alt={track.title} />
              : '🎵'}
          </div>
          <div className="player-info" onClick={() => setExpanded(true)} style={{ cursor: 'pointer' }}>
            <div className="player-title">{track.title}</div>
            <div className="player-artist">{track.artists}</div>
          </div>
          <div className="player-controls">
            <button className="ctrl-btn" onClick={prev} aria-label="Previous">⏮</button>
            <button
              className="ctrl-btn play"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {loading ? '⌛' : playing ? '⏸' : '▶'}
            </button>
            <button className="ctrl-btn" onClick={next} aria-label="Next">⏭</button>
          </div>
        </div>
      </div>
    </>
  )
}
