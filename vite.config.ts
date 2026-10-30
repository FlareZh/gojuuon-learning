import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/** Must match Vite `base` (GitHub project Pages path). */
const BASE = "/gojuuon-learning/";

export default defineConfig({
  // Project Pages: https://flarezh.github.io/gojuuon-learning/
  base: BASE,
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "五十音帖 · 手写练习",
        short_name: "五十音帖",
        description: "五十音手写练习：罗马音提示、笔顺对照、间隔重复",
        lang: "zh-CN",
        theme_color: "#ebe1d1",
        background_color: "#f7f1e6",
        display: "standalone",
        orientation: "portrait-primary",
        // Must include project Pages base — absolute "/" opens https://flarezh.github.io/
        // on iOS「添加到主屏幕」and the shortcut cannot load this app.
        start_url: BASE,
        scope: BASE,
        id: BASE,
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // App shell; stroke GIFs use runtime cache (too many for precache).
        globPatterns: ["**/*.{js,css,html,ico,svg,png,woff2,webmanifest}"],
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith(`${BASE}strokes/`),
            handler: "CacheFirst",
            options: {
              cacheName: "gojuuon-strokes",
              expiration: {
                maxEntries: 250,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
