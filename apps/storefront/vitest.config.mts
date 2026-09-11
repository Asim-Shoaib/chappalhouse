import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@root': fileURLToPath(new URL('../../', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws on import outside a React Server Component. The
      // guard is for the bundler, not for correctness, so tests stub it out to
      // reach modules like lib/catalog that are legitimately server-side.
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
    },
  },
})
