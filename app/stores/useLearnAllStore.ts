import { defineStore } from 'pinia'

type Game = {
  id: number
  title: string
  path: string
  type?: string
}

type RawCategory = {
  title: string
  categories?: RawCategory[] // Now explicitly array of categories
  games?: number[]
}

export const useLearnAllStore = defineStore('useLearnAllStore', {
  state: () => ({
    loaded: false as boolean,
    games: [] as Game[],
    categories: [] as RawCategory[],
    gameMap: {} as Record<number, Game>
  }),
  actions: {
    async load() {
      if (this.loaded) return
      try {
        const res = await fetch('/learn-game/all.json')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        this.games = data.games || []
        this.categories = data.categories || []
        this.gameMap = {}
        for (const g of this.games) this.gameMap[g.id] = g
        this.loaded = true
      } catch (e) {
        // keep not loaded and pass error up
        console.error('Failed to load /all.json', e)
        throw e
      }
    },

    // Resolve a category by a path like "Top/Sub/..." where segments match .title
    // Returns an object { node, pathSegments, breadcrumbs }
    findByPath(path?: string) {
      if (!path) return { node: null, pathSegments: [], breadcrumbs: [] }
      const segments = path.split('/').filter(Boolean)
      if (segments.length === 0) return { node: null, pathSegments: [], breadcrumbs: [] }

      const breadcrumbs: { title: string; path: string; node: RawCategory }[] = []
      let currentCategories = this.categories
      let builtPath = ''

      // Try to match each segment in path
      for (const seg of segments) {
        builtPath = builtPath ? `${builtPath}/${seg}` : seg
        
        // Search for matching category in current level
        const match = currentCategories.find(c => c.title === seg)
        if (!match) break // Stop if no match found
        
        // Add to breadcrumb
        breadcrumbs.push({ title: match.title, path: builtPath, node: match })
        
        // Move to next level if it exists
        currentCategories = match.categories || []
      }

      const last = breadcrumbs[breadcrumbs.length - 1]?.node || null
      return { node: last, pathSegments: segments, breadcrumbs }
    },

    getChildrenForNode(node: RawCategory | null) {
      // Return { categories: [], games: [] }
      const categories: { title: string; node: RawCategory }[] = []
      const games: Game[] = []

      if (!node) {
        // Top level - just wrap the categories
        for (const cat of this.categories) {
          categories.push({ title: cat.title, node: cat })
        }
        return { categories, games }
      }

      // Add subcategories if any
      if (node.categories) {
        for (const cat of node.categories) {
          categories.push({ title: cat.title, node: cat })
        }
      }

      // Add direct games if any
      if (node.games) {
        for (const gid of node.games) {
          const game = this.gameMap[gid]
          if (game) games.push(game)
        }
      }

      return { categories, games }
    }
  }
})

export default useLearnAllStore
