import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                // Keep the large list-data JSON in its own cacheable chunk.
                manualChunks(id) {
                    const normalized = id.split('\\').join('/')
                    if (normalized.includes('/data/') && normalized.endsWith('.json')) {
                        return 'data'
                    }
                },
            },
        },
    },
})
