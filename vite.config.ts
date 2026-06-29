import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base './' + viteSingleFile() bundle ALL JS/CSS inline into a single
// dist/index.html. That file runs offline by double-click (file://) with no
// web server — ES modules are inlined, so Chromium/Edge don't block them.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
})
