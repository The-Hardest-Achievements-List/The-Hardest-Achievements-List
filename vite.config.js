import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const HOME_JSON = /(?:changelog|milestones|playercountries)\.json$/i

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                // Keep heavy list JSON out of the home critical path.
                // Changelogs stay with the main bundle so they are not glued to list dumps.
                manualChunks(id) {
                    const normalized = id.split('\\').join('/')
                    if (!normalized.includes('/data/') || !normalized.endsWith('.json')) {
                        return
                    }
                    if (HOME_JSON.test(normalized)) {
                        return
                    }
                    return 'data'
                },
            },
        },
    },
})
