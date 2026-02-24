import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the root directory (3 levels up from pkg/dashboard/ui)
  const env = loadEnv(mode, resolve(__dirname, '../../../'), '')
  return {
    base: '/dashboard/',
    plugins: [react()],
    define: {
      '__APP_ENV_RECIPIENT_ID__': JSON.stringify(env.recipient_id || '')
    }
  }
})
