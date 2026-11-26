import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const api = `http://127.0.0.1:${process.env.PORT ?? 3000}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  server: {
    proxy: {
      '^/api(?:[/?]|$)': api,
      '/socket.io': { target: api, ws: true },
    },
  },
  build: {
    outDir: 'dist',
    rolldownOptions: { output: { entryFileNames: 'bundle.js' } },
  },
});
