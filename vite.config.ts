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
      // 【优化】代码分割配置
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'supabase': ['@supabase/supabase-js'],
              'matter': ['matter-js'],
              'date-fns': ['date-fns'],
              'icons': ['lucide-react'],
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
          name: 'inject-supabase-dns-prefetch',
          transformIndexHtml(html) {
            const supabaseUrl = env.VITE_SUPABASE_URL;
            if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL' || !supabaseUrl.startsWith('http')) return html;
            const origin = new URL(supabaseUrl).origin;
            const tags = `<link rel="dns-prefetch" href="${origin}">\n    <link rel="preconnect" href="${origin}" crossorigin>`;
            return html.replace('<!-- Supabase DNS 预解析由 Vite 构建时注入（见 vite.config.ts htmlPlugin） -->', tags);
          },
        },
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.png'],
          devOptions: {
            enabled: true
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            cleanupOutdatedCaches: true,
            // 【优化】预缓存更多资源类型
            maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
            // 【优化】运行时缓存策略
            runtimeCaching: [
              // Supabase API - NetworkFirst，3秒超时用缓存
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-api-cache',
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
              // Supabase 图片存储 - CacheFirst，30天缓存
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'supabase-storage-cache',
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
        })
      ],
      define: {
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // 【优化】依赖预构建配置
      optimizeDeps: {
        include: ['react', 'react-dom', 'lucide-react', 'matter-js'],
      },
    };
});
