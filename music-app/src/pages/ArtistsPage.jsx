import { useState } from 'react'
import { getArtistSongs, songToTrack } from '../api'
import { usePlayer } from '../store'

const ARTISTS = [
  { name: 'Arijit Singh',    emoji: '🎤' },
  { name: 'Shreya Ghoshal',  emoji: '🌸' },
  { name: 'Sonu Nigam',      emoji: '🎶' },
  { name: 'Udit Narayan',    emoji: '🎙️' },
  { name: 'Alka Yagnik',     emoji: '✨' },
  { name: 'Kumar Sanu',      emoji: '🎵' },
  { name: 'Jagjit Singh',    emoji: '🪔' },
  { name: 'KK',              emoji: '💙' },
  { name: 'Sunidhi Chauhan', emoji: '🔥' },
  { name: 'Kailash Kher',    emoji: '🕉️' },
  { name: 'Atif Aslam',      emoji: '🌙' },
  { name: 'Hariharan',       emoji: '🎸' },
  { name: 'Manna Dey',       emoji: '🪗' },
  { name: 'S.P. Balasubrahmanyam', emoji: '🎻' },
  { name: 'Papon',           emoji: '🍃' },
  { name: 'K.S. Chithra',    emoji: '🌺' },
]

export default function ArtistsPage() {
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const { setQueue, setPlaying } = usePlayer()

  const toggle = (name) =>
    setSelected(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name])

  const startMix = async () => {
    if (!selected.length) return
    setLoading(true)
    try {
      const songs = await getArtistSongs(selected, 60)
      const tracks = songs.map(songToTrack).filter(t => t.url)
      if (tracks.length) {
        setQueue(tracks, 0)
        setPlaying(true)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="section">
        <div className="section-title">Pick artists</div>
        <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 12 }}>
          Select one or more — we'll shuffle a mix
        </div>
      </div>

      <div className="hstrip" style={{ flexWrap: 'wrap', gap: 10, padding: '0 20px' }}>
        {ARTISTS.map(a => (
          <button
            key={a.name}
            className={`artist-chip${selected.includes(a.name) ? ' selected' : ''}`}
            onClick={() => toggle(a.name)}
            aria-pressed={selected.includes(a.name)}
          >
            <div className="chip-avatar">{a.emoji}</div>
            <span className="chip-label">{a.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <button
        className="start-btn"
        disabled={!selected.length || loading}
        onClick={startMix}
        aria-label="Start mix"
      >
        {loading
          ? 'Loading…'
          : selected.length
            ? `▶  Play mix · ${selected.length} artist${selected.length > 1 ? 's' : ''}`
            : 'Select at least one artist'}
      </button>
    </div>
  )
}
