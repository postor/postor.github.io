// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  // Add Pinia and Tailwind css modules (install packages before use)
  modules: [
    '@pinia/nuxt',
    '@nuxt/ui',
    '@vite-pwa/nuxt',
    '@nuxtjs/i18n'
  ],
  app: {
    head: {
      title: 'Nuxt Game App',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0f172a' }
      ]
    }
  },
  ui: {
    fonts: false,
  },
  alias: {
    '@mintplex-labs/piper-tts-web': '~/resolve/piper-tts-web/piper-tts-web.js'
  },
  css: [
    '~/assets/css/main.css',
    // You can also include other CSS files or libraries here,
    // for example: 'bulma', or '~/assets/css/another.scss'
  ],
  pwa: {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico'],
    manifest: {
      name: 'Game App',
      short_name: 'GameApp',
      description: 'Interactive reading and learning experiences available offline.',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' }
      ]
    },
    workbox: {
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,

      navigateFallback: '/',
      navigateFallbackAllowlist: [/^\/$/],

      runtimeCaching: [
        {
          urlPattern: ({ request }) =>
            request.destination === 'document',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
          },
        },
        {
          urlPattern: ({ request }) =>
            ['script', 'style', 'worker'].includes(request.destination),
          handler: 'CacheFirst',
          options: {
            cacheName: 'assets',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30,
            },
          },
        },
        {
          urlPattern: ({ request }) =>
            request.destination === 'image',
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 60,
            },
          },
        },
      ],
    },
  },
  i18n: {
    defaultLocale: 'zh',
    locales: [{
      code: 'zh',
      name: '中文',
      file: 'zh.json'
    }, {
      code: 'en',
      name: 'English',
      file: 'en.json'
    }],
    langDir: 'locales',
    strategy: 'no_prefix'
  },
  nitro: {
    prerender: {
      routes: ['/offline']
    }
  }
})