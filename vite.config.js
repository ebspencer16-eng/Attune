import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load all env vars (including those without VITE_ prefix) for the build plugin
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // ── Admin credential injection ─────────────────────────────────────────
      // After every build, replace placeholder tokens in dist/admin.html with
      // real Supabase credentials from env vars. This means the deployed zip
      // always has credentials baked in — no manual edits needed.
      {
        name: 'inject-admin-credentials',
        closeBundle() {
          const adminPath = path.resolve(__dirname, 'dist/admin.html')
          if (!fs.existsSync(adminPath)) return

          const supabaseUrl  = env.VITE_SUPABASE_URL  || env.SUPABASE_URL  || ''
          const supabaseAnon = env.VITE_SUPABASE_ANON_KEY || ''

          if (!supabaseUrl || !supabaseAnon) {
            console.warn('[Attune] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — admin will use synthetic data only.')
            return
          }

          let html = fs.readFileSync(adminPath, 'utf-8')
          html = html
            .replace("'%%SUPABASE_URL%%'",  JSON.stringify(supabaseUrl))
            .replace("'%%SUPABASE_ANON%%'", JSON.stringify(supabaseAnon))
          fs.writeFileSync(adminPath, html)
          console.log('[Attune] Admin credentials injected into dist/admin.html ✓')
        },
      },
    ],
    optimizeDeps: {
      include: ['@supabase/supabase-js'],
    },
  }
})
