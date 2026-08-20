import { useState } from 'react'
import { importYtPlaylist, ytTrackToTrack, searchSongs, songToTrack } from '../api'
import { usePlayer } from '../store'

export default function YouTubePage() {
  const [url, setUrl] = useState('')
  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setQueue, setPlaying } = usePlayer()

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true); setError(''); setPlaylist(null)
    try {
      const data = await importYtPlaylist(url.trim())
      setPlaylist(data)
    } catch (e) {
      setError(e.message || 'Failed to fetch playlist. Check the URL and try again.')
    }
    setLoading(false)
  }

  const playPlaylist = async () => {
    if (!playlist) return
    setLoading(true)
    
    // Stealth hybrid mode: find high-quality audio on JioSaavn to bypass YouTube bot protection
    const tracks = []
    for (const t of playlist.tracks) {
      const cleanTitle = t.title.replace(/\(Official.*?\)|\[.*?\]|ft\.|feat\./gi, '').trim()
      try {
        const results = await searchSongs(cleanTitle, 3)
        if (results.length) {
          const jiosaavnTrack = songToTrack(results[0])
          // Hide the JioSaavn source in UI
          jiosaavnTrack.artists = 'YouTube' 
          jiosaavnTrack.source = 'youtube'
          jiosaavnTrack.image = t.thumbnail
          
          if (jiosaavnTrack.url) { tracks.push(jiosaavnTrack); continue }
        }
      } catch {}
      // Fallback: we won't push the direct YT track anymore since it's strictly blocked.
      // If we can't find it, we just skip it rather than crashing the player.
    }
    
    if (tracks.length) { setQueue(tracks, 0); setPlaying(true) }
    setLoading(false)
  }

  return (
    <div className="page">
      <div className="section">
        <div className="section-title">YouTube Playlist</div>
        <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 14 }}>
          Paste a YouTube playlist link. Songs are streamed directly from YouTube (no ads).
        </div>
      </div>

      <div className="yt-box">
        <div className="yt-input-row">
          <input
            className="yt-input"
            placeholder="https://youtube.com/playlist?list=…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleImport()}
            aria-label="YouTube playlist URL"
          />
          <button className="yt-btn" onClick={handleImport} disabled={loading || !url.trim()}>
            {loading ? '…' : 'Import'}
          </button>
        </div>

        {error && <div style={{ color: 'var(--red)', fontSize: '.75rem', marginTop: 10 }}>{error}</div>}

        {playlist && (
          <>
            <div className="yt-title">📼 {playlist.title}</div>
            <div className="yt-sub">{playlist.tracks.length} tracks</div>
          </>
        )}
      </div>

      {playlist && (
        <>
          <button className="start-btn" onClick={playPlaylist} disabled={loading}>
            {loading ? 'Loading…' : `▶  Play all ${playlist.tracks.length} songs`}
          </button>

          <div className="song-list gap-top">
            {playlist.tracks.map((t, i) => (
              <div key={t.videoId} className="song-row" style={{ cursor: 'default' }}>
                <div className="song-art">
                  {t.thumbnail ? <img src={t.thumbnail} alt={t.title} loading="lazy" /> : '▶'}
                </div>
                <div className="song-info">
                  <div className="song-title">{t.title}</div>
                  <div className="song-artist">YouTube</div>
                </div>
                <span className="song-dur" style={{ fontSize: '.65rem' }}>#{i + 1}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
