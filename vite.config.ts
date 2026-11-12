import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], base: './', server: { port: 5173, strictPort: true }, build: { chunkSizeWarningLimit: 1800, rollupOptions: { input: { main: 'index.html', edit: 'edit/index.html' } } } });
