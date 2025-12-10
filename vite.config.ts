import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 如果你的仓库名是 "my-repo"，请将 base 设置为 "/my-repo/"
      // 如果是用户主页 (username.github.io)，则保持 "/"
      base: './', 
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.png'],
          devOptions: {
            enabled: true
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            cleanupOutdatedCaches: true
          },
          manifest: {
            name: 'Us - Shared Memory Journal',
            short_name: 'Us',
            description: 'A shared memory journal for couples.',
            theme_color: '#fff1f2',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait',
            scope: './',
            start_url: './',
            icons: [
              {
                src: 'icon.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: 'icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
