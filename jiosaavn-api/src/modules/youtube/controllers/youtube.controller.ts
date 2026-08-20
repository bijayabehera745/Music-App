import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { YouTubeService } from '../services/youtube.service'
import type { Routes } from '#common/types'

export class YouTubeController implements Routes {
  public controller: OpenAPIHono
  private ytService: YouTubeService

  constructor() {
    this.controller = new OpenAPIHono()
    this.ytService = new YouTubeService()
  }

  public initRoutes() {
    // GET /api/youtube/playlist?url=...
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/youtube/playlist',
        tags: ['YouTube'],
        summary: 'Get YouTube playlist tracks',
        description: 'Extract video titles from a YouTube playlist URL using the YouTube Data API.',
        operationId: 'getYoutubePlaylist',
        request: {
          query: z.object({
            url: z.string().openapi({
              title: 'YouTube playlist URL',
              description: 'Full YouTube playlist URL',
              example: 'https://www.youtube.com/playlist?list=PLxxxxxx'
            })
          })
        },
        responses: {
          200: {
            description: 'Playlist tracks',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    title: z.string(),
                    tracks: z.array(
                      z.object({
                        videoId: z.string(),
                        title: z.string(),
                        thumbnail: z.string().optional()
                      })
                    )
                  })
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        const { url } = ctx.req.valid('query')
        const result = await this.ytService.getPlaylist(url)
        return ctx.json({ success: true, data: result })
      }
    )

    // GET /api/youtube/stream?videoId=...
    this.controller.openapi(
      createRoute({
        method: 'get',
        path: '/youtube/stream',
        tags: ['YouTube'],
        summary: 'Get YouTube audio stream URL',
        description: 'Get a direct audio stream URL for a YouTube video (no ads).',
        operationId: 'getYoutubeStream',
        request: {
          query: z.object({
            videoId: z.string().openapi({
              title: 'YouTube video ID',
              description: 'YouTube video ID',
              example: 'dQw4w9WgXcQ'
            })
          })
        },
        responses: {
          200: {
            description: 'Audio stream URL',
            content: {
              'application/json': {
                schema: z.object({
                  success: z.boolean(),
                  data: z.object({
                    url: z.string(),
                    title: z.string(),
                    thumbnail: z.string().optional(),
                    duration: z.number().optional()
                  })
                })
              }
            }
          }
        }
      }),
      async (ctx) => {
        const { videoId } = ctx.req.valid('query')
        const result = await this.ytService.getStreamUrl(videoId)
        return ctx.json({ success: true, data: result })
      }
    )
  }
}
