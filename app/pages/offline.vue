<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
    <div class="max-w-xl">
      <h1 class="text-3xl font-semibold">You are offline</h1>
      <p class="mt-2 text-base text-gray-600 dark:text-gray-300">
        This app is still available without a connection. Some features using large speech models may
        require a one-time download while you are online.
      </p>
      <UButton class="mt-6" to="/" color="primary">
        Go back home
      </UButton>
    </div>
  </main>
</template>

<script setup lang="ts">
useHead({
  title: 'Offline',
  meta: [
    { name: 'robots', content: 'noindex' }
  ]
})
</script>
