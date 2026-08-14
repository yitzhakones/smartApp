import { defineConfig } from 'vitest/config'

// Mirrors tsconfig.json's "@/*" path alias so tests can import the same way the
// app does. No test previously imported across directories with '@/', so this
// gap went unnoticed until lib/dashboard/trend.ts needed lib/categories.ts.
export default defineConfig({
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
})
