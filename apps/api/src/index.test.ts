import { describe, it, expect, vi } from 'vitest'

// Mock handleBookProcessing so we can observe dispatch without running the real pipeline.
vi.mock('./queue/book-processing', () => ({
  handleBookProcessing: vi.fn(async () => {})
}))

import worker from './index'
import { handleBookProcessing } from './queue/book-processing'

describe('Worker entry', () => {
  it('exports both fetch and queue handlers', () => {
    expect(typeof (worker as unknown as { fetch: unknown }).fetch).toBe('function')
    expect(typeof (worker as unknown as { queue: unknown }).queue).toBe('function')
  })

  it('queue handler dispatches publish_book messages to handleBookProcessing and acks them', async () => {
    const acked: string[] = []
    const retried: string[] = []
    const batch = {
      queue: 'book-processing',
      messages: [
        {
          id: 'm1',
          body: { type: 'publish_book', bookId: 'b1', userId: 'u1' },
          ack: () => acked.push('m1'),
          retry: () => retried.push('m1')
        }
      ]
    } as unknown as MessageBatch<unknown>

    const env = {} as unknown
    const ctx = {} as unknown

    const queueFn = (worker as unknown as {
      queue: (b: MessageBatch<unknown>, e: unknown, c: unknown) => Promise<void>
    }).queue

    await queueFn(batch, env, ctx)

    expect(handleBookProcessing).toHaveBeenCalledTimes(1)
    expect(acked).toEqual(['m1'])
    expect(retried).toEqual([])
  })

  it('queue handler retries a message when handleBookProcessing throws', async () => {
    ;(handleBookProcessing as unknown as { mockImplementationOnce: (fn: () => Promise<void>) => void })
      .mockImplementationOnce(async () => {
        throw new Error('boom')
      })

    const acked: string[] = []
    const retried: string[] = []
    const batch = {
      queue: 'book-processing',
      messages: [
        {
          id: 'm2',
          body: { type: 'publish_book', bookId: 'b2', userId: 'u2' },
          ack: () => acked.push('m2'),
          retry: () => retried.push('m2')
        }
      ]
    } as unknown as MessageBatch<unknown>

    const queueFn = (worker as unknown as {
      queue: (b: MessageBatch<unknown>, e: unknown, c: unknown) => Promise<void>
    }).queue

    await queueFn(batch, {} as unknown, {} as unknown)

    expect(retried).toEqual(['m2'])
    expect(acked).toEqual([])
  })
})
