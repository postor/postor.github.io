import { defineNuxtPlugin } from 'nuxt/app'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import type { Pinia } from 'pinia'

export default defineNuxtPlugin((nuxtApp) => {
  // Register the persisted state plugin only on client
  ;(nuxtApp.$pinia as Pinia).use(piniaPluginPersistedstate)
})
