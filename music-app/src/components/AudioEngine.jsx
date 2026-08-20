import { useRef, useEffect, useCallback } from 'react'
import { usePlayer } from '../store'

export default function AudioEngine() {
  const ref = useRef(null)
  const { queue, index, playing, volume, setPlaying, setProgress, setLoading, next, resolveYtUrl } = usePlayer()
  const track = queue[index] ?? null

  const load = useCallback(async (t) => {
    if (!t) return
    let url = t.url
    if (t.source === 'youtube' && !url) {
      url = await resolveYtUrl(t)
    }
    if (!url) { next(); return }
    const el = ref.current
    if (!el) return
    el.src = url
    el.volume = volume
    el.play().catch(() => {})
  }, [volume, next, resolveYtUrl])

  // Load when track changes
  useEffect(() => {
    if (track) load(track)
    else if (ref.current) { ref.current.pause(); ref.current.src = '' }
  }, [track?.id]) // eslint-disable-line

  // Sync play/pause
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (playing) el.play().catch(() => {})
    else el.pause()
  }, [playing])

  // Sync volume
  useEffect(() => {
    if (ref.current) ref.current.volume = volume
  }, [volume])

  return (
    <audio
      ref={ref}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={next}
      onWaiting={() => setLoading(true)}
      onCanPlay={() => setLoading(false)}
      onTimeUpdate={(e) => {
        const el = e.target
        setProgress(el.duration ? el.currentTime / el.duration : 0)
      }}
    />
  )
}
