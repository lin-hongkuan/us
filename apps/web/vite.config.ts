import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const projectRoot = path.resolve(__dirname, '../..');
    const env = loadEnv(mode, projectRoot, '');
    const isTauri = !!process.env.TAURI_ENV_PLATFORM;
    const devPort = Number(process.env.VITE_DEV_PORT || env.VITE_DEV_PORT || 3000);
    const strictPort = (process.env.VITE_STRICT_PORT || env.VITE_STRICT_PORT || 'true') !== 'false';
    return {
      root: __dirname,
      envDir: projectRoot, // .env 在仓库根目录，必须显式指定
      // 如果你的仓库名是 "my-repo"，请将 base 设置为 "/my-repo/"
      // 如果是用户主页 (username.github.io)，则保持 "/"
      base: './', 
      clearScreen: false,
      server: {
        port: devPort,
        host: '0.0.0.0',
        strictPort,
        proxy: {
          '/api': {
            target: env.VITE_CLOUDFLARE_API_BASE_URL || 'http://127.0.0.1:8787',
            changeOrigin: true,
          },
          '/images': {
            target: env.VITE_CLOUDFLARE_API_BASE_URL || 'http://127.0.0.1:8787',
            changeOrigin: true,
          },
        },
      },
      // 【优化】代码分割配置
      build: {
        modulePreload: {
          polyfill: false,
          resolveDependencies: (_url, deps) => deps.filter(dep => !dep.includes('supabase-')),
        },
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              if (
                id.includes('/react/') ||
                id.includes('/react-dom/') ||
                id.includes('/scheduler/')
              ) {
                return 'react-vendor';
              }
              if (id.includes('/@supabase/')) return 'supabase';
              if (id.includes('/matter-js/')) return 'matter';
              if (id.includes('/date-fns/')) return 'date-fns';
              if (id.includes('/@tauri-apps/')) return 'tauri';
              return undefined;
            },
          },
        },
        minify: 'esbuild',
        cssTarget: 'chrome100',
        chunkSizeWarningLimit: 500,
        assetsInlineLimit: 4096,
      },
      plugins: [
        react(),
        {
          name: 'inject-cloudflare-api-prefetch',
          transformIndexHtml(html) {
            const apiBase = env.VITE_CLOUDFLARE_API_BASE_URL;
            if (!apiBase || !apiBase.startsWith('http')) return html;
            const origin = new URL(apiBase).origin;
            const tags = `<link rel="dns-prefetch" href="${origin}">\n    <link rel="preconnect" href="${origin}" crossorigin>`;
            return html.replace('<!-- Supabase DNS 预解析由 Vite 构建时注入（见 vite.config.ts htmlPlugin） -->', tags);
          },
        },
        !isTauri && VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.png'],
          devOptions: {
            enabled: false
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            cleanupOutdatedCaches: true,
            // 【优化】预缓存更多资源类型
            maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
            // 【优化】运行时缓存策略
            runtimeCaching: [
              // Cloudflare API - NetworkFirst，3秒超时用缓存
              {
                urlPattern: ({ url }) => url.pathname.startsWith('/api/memories'),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'cloudflare-api-cache',
                  networkTimeoutSeconds: 3,
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24, // 24小时
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              // Cloudflare R2 图片 - CacheFirst，30天缓存
              {
                urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cloudflare-images-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30天
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              // Google Fonts CSS - CacheFirst，1年缓存
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-stylesheets',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              // Google Fonts 字体文件 - CacheFirst，1年缓存
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-webfonts',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              // 图片资源 - CacheFirst
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30天
                  },
                },
              },
              // JS/CSS 资源 - StaleWhileRevalidate
              {
                urlPattern: /\.(?:js|css)$/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'static-resources',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7, // 7天
                  },
                },
              },
            ],
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
        }),
      ].filter(Boolean),
      define: {
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      // 【优化】依赖预构建配置
      optimizeDeps: {
        include: ['react', 'react-dom', 'lucide-react', 'matter-js'],
      },
    };
});
