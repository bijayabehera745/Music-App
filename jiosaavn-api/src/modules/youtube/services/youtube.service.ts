import ytdl from '@distube/ytdl-core'

const YT_API_KEY = process.env.YOUTUBE_API_KEY || ''
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'

export class YouTubeService {
  /** Extract playlist ID from a full YouTube playlist URL */
  private extractPlaylistId(url: string): string | null {
    try {
      const u = new URL(url)
      return u.searchParams.get('list')
    } catch {
      return null
    }
  }

  /** Fetch all video titles from a YouTube playlist via the Data API */
  async getPlaylist(playlistUrl: string): Promise<{ title: string; tracks: Array<{ videoId: string; title: string; thumbnail?: string }> }> {
    const playlistId = this.extractPlaylistId(playlistUrl)
    if (!playlistId) throw new Error('Invalid YouTube playlist URL')

    if (!YT_API_KEY) throw new Error('YOUTUBE_API_KEY env variable not set')

    const tracks: Array<{ videoId: string; title: string; thumbnail?: string }> = []
    let pageToken: string | undefined
    let playlistTitle = 'YouTube Playlist'

    // First fetch playlist metadata for title
    const metaRes = await fetch(`${YT_API_BASE}/playlists?part=snippet&id=${playlistId}&key=${YT_API_KEY}`)
    const metaJson = (await metaRes.json()) as any
    if (metaJson.items?.[0]) {
      playlistTitle = metaJson.items[0].snippet?.title ?? playlistTitle
    }

    // Paginate through all playlist items
    do {
      const params = new URLSearchParams({
        part: 'snippet',
        playlistId,
        maxResults: '50',
        key: YT_API_KEY,
        ...(pageToken ? { pageToken } : {})
      })
      const res = await fetch(`${YT_API_BASE}/playlistItems?${params}`)
      const json = (await res.json()) as any
      if (!json.items) break

      for (const item of json.items) {
        const snippet = item.snippet
        const videoId = snippet?.resourceId?.videoId
        if (!videoId || snippet?.title === 'Deleted video' || snippet?.title === 'Private video') continue
        tracks.push({
          videoId,
          title: snippet.title,
          thumbnail: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url
        })
      }
      pageToken = json.nextPageToken
    } while (pageToken)

    return { title: playlistTitle, tracks }
  }

  /** Get a direct audio stream URL for a YouTube video using ytdl-core */
  async getStreamUrl(videoId: string): Promise<{ url: string; title: string; thumbnail?: string; duration?: number }> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const info = await ytdl.getInfo(videoUrl)
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' })
    return {
      url: format.url,
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails?.at(-1)?.url,
      duration: Number(info.videoDetails.lengthSeconds)
    }
  }
}
