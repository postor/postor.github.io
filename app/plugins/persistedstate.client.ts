import { defineNuxtPlugin } from 'nuxt/app'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import type { Pinia } from 'pinia'

export default defineNuxtPlugin((nuxtApp) => {
  // Register the persisted state plugin only on client and add debug info
  if (process.client) {
    const pinia = nuxtApp.$pinia as Pinia | undefined
    if (!pinia) {
      // This should not happen when @pinia/nuxt is enabled, but log so we can diagnose
      // Check browser console for this warning.
      // eslint-disable-next-line no-console
      console.warn('[persistedstate] $pinia is not available on nuxtApp; persistedstate plugin not registered')
      return
    }
    // eslint-disable-next-line no-console
    console.debug('[persistedstate] registering pinia-plugin-persistedstate')
    pinia.use(piniaPluginPersistedstate)
  }
})
