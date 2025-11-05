// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true,
  // Add Pinia and Tailwind css modules (install packages before use)
  modules: ['@pinia/nuxt', '@nuxt/ui', '@vite-pwa/nuxt', '@nuxtjs/i18n'],
  app: {
    head: {
      title: 'Nuxt Game App',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
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
  }
})