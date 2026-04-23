import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        compatibilityDate: '2025-04-21',
        d1Databases: ['DB'],
        kvNamespaces: ['KV'],
        r2Buckets: ['R2'],
        queueProducers: { QUEUE: 'book-processing' }
      }
    })
  ],
  test: {
    include: ['src/**/*.test.ts'],
    globals: true,
    testTimeout: 15000,
    poolOptions: {
      workers: {
        singleWorker: true,
        minWorkers: 1,
        maxWorkers: 1,
      },
    },
  }
})
