import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { createCacheControlPlugin } from './build/cache.js';
import { createPostCssPlugins } from './build/css.js';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), createCacheControlPlugin(mode)],
    css: {
      postcss: {
        plugins: createPostCssPlugins(command),
      },
    },
    server: {
      host: 'greendesk.org',
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    test: { environment: 'jsdom', setupFiles: './src/test.setup.js' },
  };
});
