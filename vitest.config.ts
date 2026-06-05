import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // @gmcr/shared compila pra dist/ pra rodar em produção (Node não lê TS),
    // mas durante os testes resolvemos direto pro source pra não depender de
    // build prévia.
    alias: {
      '@gmcr/shared': fileURLToPath(new URL('./shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
