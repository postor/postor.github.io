<template>
  <div class="min-h-screen p-4 sm:p-8 bg-slate-50">
    <div class="max-w-4xl mx-auto">
      <!-- Breadcrumb -->
      <nav v-if="breadcrumbs.length > 0" class="text-sm text-slate-600 mb-4" aria-label="Breadcrumb">
        <ol class="flex items-center gap-2">
          <li>
            <NuxtLink to="/" class="hover:underline">首页</NuxtLink>
          </li>
          <li v-for="(b, i) in breadcrumbs" :key="i" class="flex items-center">
            <span class="mx-2">/</span>
            <NuxtLink :to="b.href" class="text-slate-700 hover:underline">{{ b.title }}</NuxtLink>
          </li>
        </ol>
      </nav>

      <header class="mb-6">
        <h1 class="text-2xl font-semibold text-slate-800">{{ viewTitle }}</h1>
        <p class="text-sm text-slate-500 mt-1">选择一个分类或书籍开始阅读</p>
      </header>

      <!-- Top level: Show each category as a section -->
      <div v-if="!queryCategory">
        <section v-for="category in topCategories" :key="category.title" class="mb-12">
          <h2 class="text-xl font-medium text-slate-700 mb-4">{{ category.title }}</h2>
          <div class="overflow-x-auto -mx-4 px-4">
            <div class="flex gap-4 items-start">
              <template v-for="(item, idx) in category.items" :key="idx">
                <div v-if="item.type === 'category'" class="w-28 shrink-0">
                  <NuxtLink :to="item.href" class="block text-center">
                    <div class="h-16 w-16 rounded-lg bg-linear-to-tr from-indigo-400 to-indigo-600 mx-auto flex items-center justify-center text-white text-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </div>
                    <div class="mt-2 text-sm text-slate-700 truncate">{{ item.title }}</div>
                  </NuxtLink>
                </div>

                <div v-else class="w-28 shrink-0">
                  <a :href="item.href" class="block text-center">
                    <div class="h-16 w-16 rounded-lg bg-yellow-400 mx-auto flex items-center justify-center text-white text-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6 2a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6.414A2 2 0 0014.414 5L11 1.586A2 2 0 009.586 1H6z" />
                      </svg>
                    </div>
                    <div class="mt-2 text-sm text-slate-700 truncate">{{ item.title }}</div>
                  </a>
                </div>
              </template>
            </div>
          </div>
        </section>
      </div>
      
      <!-- Sub-level: Show items in a single section -->
      <section v-else>
        <div class="overflow-x-auto -mx-4 px-4">
          <div class="flex gap-4 items-start">
            <template v-for="(item, idx) in displayItems" :key="idx">
              <div v-if="item.type === 'category'" class="w-28 shrink-0">
                <NuxtLink :to="item.href" class="block text-center">
                  <div class="h-16 w-16 rounded-lg bg-linear-to-tr from-indigo-400 to-indigo-600 mx-auto flex items-center justify-center text-white text-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <div class="mt-2 text-sm text-slate-700 truncate">{{ item.title }}</div>
                </NuxtLink>
              </div>

              <div v-else class="w-28 shrink-0">
                <a :href="item.href" class="block text-center">
                  <div class="h-16 w-16 rounded-lg bg-yellow-400 mx-auto flex items-center justify-center text-white text-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6 2a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6.414A2 2 0 0014.414 5L11 1.586A2 2 0 009.586 1H6z" />
                    </svg>
                  </div>
                  <div class="mt-2 text-sm text-slate-700 truncate">{{ item.title }}</div>
                </a>
              </div>
            </template>
          </div>
        </div>
      </section>

      <!-- Fallback / info -->
      <div v-if="loading" class="mt-6 text-sm text-slate-500">加载中…</div>
      <div v-if="error" class="mt-6 text-sm text-red-600">加载失败：{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAllStore } from '~/stores/useAll'

// Local state
const store = useAllStore()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref<string | null>(null)

const queryCategory = computed(() => {
  const q = route.query.category
  if (!q) return ''
  return Array.isArray(q) ? q[0] : String(q)
})

const breadcrumbs = ref<{ title: string; href: string }[]>([])
const displayItems = ref<any[]>([])
const viewTitle = ref('分类')
const topCategories = ref<{ title: string; items: any[] }[]>([])

async function refreshFromQuery() {
  loading.value = true
  error.value = null
  try {
    await store.load()
    const catPath = queryCategory.value
    if (!catPath) {
      // top-level view
      viewTitle.value = '全部分类'
      breadcrumbs.value = []
      // Build sections for each top-level category
      topCategories.value = store.categories.map(cat => {
        const items = []
        // Add sub-categories if any
        if (cat.categories) {
          for (const sub of cat.categories) {
            items.push({ 
              type: 'category', 
              title: sub.title, 
              href: `/?category=${encodeURIComponent(cat.title + '/' + sub.title)}` 
            })
          }
        }
        // Add direct games if this category has them
        if (cat.games) {
          for (const gid of cat.games) {
            const game = store.gameMap[gid]
            if (game) {
              items.push({ type: 'game', title: game.title, href: `/game?cfg=${encodeURIComponent(game.path)}` })
            }
          }
        }
        return { title: cat.title, items }
      })
    } else {
      const res = store.findByPath(catPath)
      // breadcrumbs from store
      const bc: { title: string; href: string }[] = []
      for (let i = 0; i < res.breadcrumbs.length; i++) {
        const b = res.breadcrumbs[i] as any
        const href = `/?category=${encodeURIComponent(res.breadcrumbs.slice(0, i + 1).map((x: any) => x.title).join('/'))}`
        bc.push({ title: b.title || b.node?.title || '—', href })
      }
      breadcrumbs.value = bc
      viewTitle.value = res.breadcrumbs.length ? res.breadcrumbs[res.breadcrumbs.length - 1]?.title || '' : '分类'
      const children = store.getChildrenForNode(res.node)
      buildDisplay(children, res)
    }
  } catch (e: any) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}

function buildDisplay(children: any, res?: any) {
  const items: any[] = []
  // categories first
  for (const c of children.categories || []) {
    const fullPath = (breadcrumbs.value.length ? breadcrumbs.value.map(b => b.title).join('/') + '/' : '') + c.title
    items.push({ type: 'category', title: c.title, href: `/?category=${encodeURIComponent(fullPath)}` })
  }
  // then games
  for (const g of children.games || []) {
    items.push({ type: 'game', title: g.title, href: `/game?cfg=${encodeURIComponent(g.path)}` })
  }
  displayItems.value = items
}

onMounted(() => {
  refreshFromQuery()
})

watch(() => route.query.category, () => {
  refreshFromQuery()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 2rem;
}

h1 {
  color: #42b883;
  margin-bottom: 1rem;
}

p {
  color: #35495e;
}
</style>