import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev ports are configurable in case another project already uses these.
// Set via env or falling back to:
//   VITE_PORT=5173    (frontend dev server)
//   BACKEND_PORT=8000 (Laravel `php artisan serve`)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vitePort = parseInt(env.VITE_PORT || '5173', 10)
  const backendPort = parseInt(env.BACKEND_PORT || '8000', 10)
  const backendUrl = `http://localhost:${backendPort}`

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: vitePort,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          cookieDomainRewrite: `localhost:${vitePort}`,
        },
        '/sanctum': {
          target: backendUrl,
          changeOrigin: true,
          cookieDomainRewrite: `localhost:${vitePort}`,
        },
        '/storage': {
          target: backendUrl,
          changeOrigin: true,
          cookieDomainRewrite: `localhost:${vitePort}`,
        },
      },
    },
  }
})
