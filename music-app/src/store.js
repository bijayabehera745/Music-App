import { create } from 'zustand'
import { getYtStreamUrl } from './api'

// Tiny zustand store — no extra deps beyond react
// install: npm i zustand
export const usePlayer = create((set, get) => ({
  queue: [],         // array of track objects
  index: 0,         // current track index
  playing: false,
  progress: 0,      // 0-1
  volume: 0.85,
  loading: false,

  setQueue: (queue, startIndex = 0) => set({ queue, index: startIndex, progress: 0 }),
  setIndex: (index) => set({ index, progress: 0 }),
  setPlaying: (playing) => set({ playing }),
  setProgress: (progress) => set({ progress }),
  setVolume: (volume) => set({ volume }),
  setLoading: (loading) => set({ loading }),

  current: () => {
    const { queue, index } = get()
    return queue[index] ?? null
  },

  next: () => {
    const { queue, index } = get()
    if (index < queue.length - 1) set({ index: index + 1, progress: 0 })
  },

  prev: () => {
    const { index } = get()
    if (index > 0) set({ index: index - 1, progress: 0 })
  },

  resolveYtUrl: async (track) => {
    if (track.source !== 'youtube' || track.url) return track.url
    set({ loading: true })
    try {
      const data = await getYtStreamUrl(track.videoId)
      // Patch url into the queue
      const { queue, index } = get()
      const newQueue = [...queue]
      newQueue[index] = { ...track, url: data.url, duration: data.duration }
      set({ queue: newQueue, loading: false })
      return data.url
    } catch {
      set({ loading: false })
      return null
    }
  }
}))
