import { renderPlayground, type PlaygroundOptions, type PlaygroundResult } from './compile'

export type PlaygroundRequest = { id: number; source: string; options: PlaygroundOptions }
export type PlaygroundResponse = PlaygroundResult & { id: number }

self.addEventListener('message', (event: MessageEvent<PlaygroundRequest>) => {
  const { id, source, options } = event.data
  void renderPlayground(source, options).then((result) => {
    self.postMessage({ id, ...result } satisfies PlaygroundResponse)
  })
})
