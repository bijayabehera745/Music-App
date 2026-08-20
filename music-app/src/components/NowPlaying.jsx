import { usePlayer } from '../store'

function fmt(s) {
  const t = Math.max(0, Math.round(s))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export default function NowPlaying({ onClose }) {
  const { queue, index, playing, progress, volume, setPlaying, setProgress, setVolume, next, prev, loading } = usePlayer()
  const track = queue[index] ?? null
  if (!track) return null

  const pct = `${(progress * 100).toFixed(1)}%`
  const dur = track.duration || 0

  return (
    <div className="now-playing-overlay">
      <button className="np-close" onClick={onClose} aria-label="Close">↙</button>

      <div className="np-art">
        {track.image ? <img src={track.image} alt={track.title} /> : '🎵'}
      </div>

      <div className="np-title">{track.title}</div>
      <div className="np-artist">{track.artists}</div>

      <div className="np-progress-wrap">
        <input
          className="np-progress"
          type="range" min={0} max={1} step={0.001}
          value={progress}
          style={{ '--pct': pct }}
          onChange={e => {
            const el = document.querySelector('audio')
            if (el && el.duration) el.currentTime = e.target.value * el.duration
            setProgress(Number(e.target.value))
          }}
        />
        <div className="np-times">
          <span>{fmt(progress * dur)}</span>
          <span>{fmt(dur)}</span>
        </div>
      </div>

      <div className="np-controls">
        <button className="np-ctrl" onClick={prev} aria-label="Previous">⏮</button>
        <button
          className="np-ctrl play"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {loading ? '⌛' : playing ? '⏸' : '▶'}
        </button>
        <button className="np-ctrl" onClick={next} aria-label="Next">⏭</button>
      </div>

      <div className="np-vol">
        <span className="np-vol-icon">🔈</span>
        <input
          className="np-vol-slider"
          type="range" min={0} max={1} step={0.01}
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
        />
        <span className="np-vol-icon">🔊</span>
      </div>
    </div>
  )
}
