// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: true,
  // Add Pinia and Tailwind css modules (install packages before use)
  modules: ['@pinia/nuxt', '@nuxt/ui', '@vite-pwa/nuxt'],
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
  alias:{
    '@mintplex-labs/piper-tts-web': '~/resolve/piper-tts-web/piper-tts-web.js'
  },
  css: [
    '~/assets/css/main.css',
    // You can also include other CSS files or libraries here,
    // for example: 'bulma', or '~/assets/css/another.scss'
  ],
})