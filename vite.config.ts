import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProd = mode === 'production';
    
    return {
      // 如果你的仓库名是 "my-repo"，请将 base 设置为 "/my-repo/"
      // 如果是用户主页 (username.github.io)，则保持 "/"
      base: './', 
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // 生产环境构建优化
      build: {
        // 启用 minify
        minify: 'esbuild',
        // 代码分割策略
        rollupOptions: {
          output: {
            // 手动分割代码块
            manualChunks: {
              // React 核心
              'react-vendor': ['react', 'react-dom'],
              // 日期处理
              'date-fns': ['date-fns'],
              // 图标库
              'lucide': ['lucide-react'],
              // 物理引擎（懒加载时会自动分割）
              'matter': ['matter-js'],
              // Supabase
              'supabase': ['@supabase/supabase-js'],
            },
          },
        },
        // 启用 CSS 代码分割
        cssCodeSplit: true,
        // 资源内联阈值 (4kb 以下内联)
        assetsInlineLimit: 4096,
        // 生成 source map 仅在开发时
        sourcemap: !isProd,
        // 启用压缩报告
        reportCompressedSize: false,
        // chunk 大小警告阈值
        chunkSizeWarningLimit: 500,
      },
      // 依赖预构建优化
      optimizeDeps: {
        include: ['react', 'react-dom', 'date-fns', 'lucide-react'],
        // 排除大型库，让它们按需加载
        exclude: ['matter-js'],
      },
      // esbuild 配置
      esbuild: {
        // 生产环境移除 console 和 debugger
        drop: isProd ? ['console', 'debugger'] : [],
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.png'],
          devOptions: {
            enabled: false // 开发时禁用 PWA 以提升速度
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            cleanupOutdatedCaches: true,
            // 运行时缓存策略
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-api',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 // 24小时
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30天
                  }
                }
              }
            ]
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
