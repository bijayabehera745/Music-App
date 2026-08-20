import { useState, useEffect } from 'react'
import { getTrending, songToTrack } from '../api'
import { usePlayer } from '../store'

export default function HomePage() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const { setQueue, setPlaying, current } = usePlayer()

  useEffect(() => {
    let active = true
    getTrending()
      .then(results => active && setSongs(results.map(songToTrack)))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const playFrom = (i) => {
    setQueue(songs, i)
    setPlaying(true)
  }

  const activeSongId = current()?.id

  return (
    <div className="page">
      <div className="section">
        <div className="section-title">Trending now</div>
      </div>

      {loading && (
        <div className="loading-state"><div className="spinner" /><div>Loading trending songs…</div></div>
      )}

      {!loading && songs.length === 0 && (
        <div className="empty-state">Could not load songs.<br />Is the API server running?</div>
      )}

      <div className="song-list gap-top">
        {songs.map((t, i) => (
          <button
            key={t.id}
            className={`song-row${activeSongId === t.id ? ' active' : ''}`}
            onClick={() => playFrom(i)}
            aria-label={`Play ${t.title}`}
          >
            <div className="song-art">
              {t.image ? <img src={t.image} alt={t.title} loading="lazy" /> : '🎵'}
            </div>
            <div className="song-info">
              <div className="song-title">{t.title}</div>
              <div className="song-artist">{t.artists}</div>
            </div>
            {activeSongId === t.id && <span style={{ color: 'var(--accent)', fontSize: '.7rem' }}>▶</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
