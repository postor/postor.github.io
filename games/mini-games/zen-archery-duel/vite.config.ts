import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // 👇 REQUIRED for subfolder deployment
    // change `/my-app/` to your actual subpath
    base: mode === 'production' ? '/mini-game/zen-archery/' : '/',
    build: {
      outDir: path.resolve(__dirname, '../../../public/mini-game/zen-archery'),
      emptyOutDir: true, // recommended
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
