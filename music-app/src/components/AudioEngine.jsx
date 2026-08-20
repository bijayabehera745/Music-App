import { useRef, useEffect, useCallback } from 'react'
import { usePlayer } from '../store'

export default function AudioEngine() {
  const ref = useRef(null)
  const audioCtxRef = useRef(null)
  const { queue, index, playing, volume, setPlaying, setProgress, setLoading, next, resolveYtUrl, blobCache, prefetchNext } = usePlayer()
  const track = queue[index] ?? null

  // Web Audio API Beat Detection
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.crossOrigin = 'anonymous'

    const initAudio = () => {
      if (audioCtxRef.current) return
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return

      try {
        const ctx = new AudioContext()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 64
        const source = ctx.createMediaElementSource(el)
        source.connect(analyser)
        analyser.connect(ctx.destination)
        audioCtxRef.current = ctx

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const loop = () => {
          requestAnimationFrame(loop)
          if (el.paused) return
          analyser.getByteFrequencyData(dataArray)
          
          // Calculate bass intensity (first 4 bins out of 32)
          let sum = 0
          for (let i = 0; i < 4; i++) sum += dataArray[i]
          
          // Smooth the intensity value
          const intensity = Math.max(0, (sum / 4) / 255)
          document.documentElement.style.setProperty('--beat-intensity', intensity.toFixed(3))
        }
        loop()
      } catch (e) { console.error('AudioContext error:', e) }
    }

    el.addEventListener('play', initAudio)
    return () => el.removeEventListener('play', initAudio)
  }, [])

  const load = useCallback(async (t) => {
    if (!t) return
    let url = blobCache[t.id] // use pre-fetched blob if available!
    if (!url) {
      url = t.url
      if (t.source === 'youtube' && !url) {
        url = await resolveYtUrl(t)
      }
    }
    
    if (!url) { next(); return }
    const el = ref.current
    if (!el) return
    el.src = url
    el.volume = volume
    el.play().catch(() => {})
  }, [volume, next, resolveYtUrl, blobCache])

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
        const prog = el.duration ? el.currentTime / el.duration : 0
        setProgress(prog)
        if (prog > 0.85) prefetchNext()
      }}
    />
  )
}
