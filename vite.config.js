import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'],
  },
});
