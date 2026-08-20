import { AlbumController, ArtistController, SearchController, SongController } from '#modules/index'
import { PlaylistController } from '#modules/playlists/controllers'
import { YouTubeController } from '#modules/youtube'
import { App } from './app'

import { serve } from '@hono/node-server'

const app = new App([
  new SearchController(),
  new SongController(),
  new AlbumController(),
  new ArtistController(),
  new PlaylistController(),
  new YouTubeController()
]).getApp()

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3000
  console.log(`Starting server on port ${port}...`)
  serve({
    fetch: app.fetch,
    port
  })
}

export default app
