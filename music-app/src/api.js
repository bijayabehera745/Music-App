// Central API client — swap VITE_API_BASE in .env for prod
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = `${BASE}/${path}${qs ? '?' + qs : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ── JioSaavn ──────────────────────────────────────────────────────────────────

export async function searchSongs(query, limit = 20) {
  const d = await get('search/songs', { query, limit })
  return d.data?.results ?? []
}

export const TRENDING_QUERIES = [
  'hindi top hits 2024',
  'bollywood romantic hits',
  'hindi 90s superhits',
  'hindi party songs',
  'arijit singh best songs',
  'shreya ghoshal melody',
  'old hindi classics',
  'hindi sad songs',
]

export async function getTrending() {
  const q = TRENDING_QUERIES[Math.floor(Math.random() * TRENDING_QUERIES.length)]
  return searchSongs(q, 30)
}

export async function getArtistSongs(artists, limit = 40) {
  // Shuffle + interleave results from multiple artists
  const perArtist = Math.max(8, Math.floor(limit / artists.length))
  const results = await Promise.all(artists.map(a => searchSongs(a, perArtist)))
  const combined = []
  const maxLen = Math.max(...results.map(r => r.length))
  for (let i = 0; i < maxLen; i++) {
    for (const r of results) if (r[i]) combined.push(r[i])
  }
  return combined
}

export function pickUrl(urls, quality = '320kbps') {
  const order = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps']
  const m = Object.fromEntries((urls ?? []).filter(u => u.url).map(u => [u.quality, u.url]))
  if (m[quality]) return m[quality]
  for (const q of order) if (m[q]) return m[q]
  return null
}

export function songToTrack(s) {
  return {
    id: s.id,
    title: s.name,
    artists: (s.artists?.primary ?? []).map(a => a.name).join(', '),
    image: s.image?.at(-1)?.url ?? s.image?.at(0)?.url,
    url: pickUrl(s.downloadUrl ?? []),
    source: 'jiosaavn',
    duration: Number(s.duration) || 0,
  }
}

// ── YouTube ───────────────────────────────────────────────────────────────────

export async function importYtPlaylist(url) {
  const d = await get('youtube/playlist', { url })
  return d.data // { title, tracks: [{videoId, title, thumbnail}] }
}

export async function getYtStreamUrl(videoId) {
  const d = await get('youtube/stream', { videoId })
  return d.data // { url, title, thumbnail, duration }
}

export function ytTrackToTrack(t) {
  return {
    id: `yt-${t.videoId}`,
    title: t.title,
    artists: 'YouTube',
    image: t.thumbnail,
    url: null, // resolved lazily when playing
    videoId: t.videoId,
    source: 'youtube',
    duration: t.duration ?? 0,
  }
}
