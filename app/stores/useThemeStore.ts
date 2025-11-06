import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'auto'

export const useThemeStore = defineStore('theme', () => {
  // 主题模式: 'light', 'dark', 'auto'
  const mode = ref<ThemeMode>('auto')
  // 当前是否暗色
  const isDark = ref(false)

  // 检测系统主题
  function detectSystemDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // 计算当前主题 class
  const themeClass = computed(() => (isDark.value ? 'dark' : 'light'))

  // 切换主题
  function setTheme(newMode: ThemeMode) {
    mode.value = newMode
    updateTheme()
    saveTheme()
  }

  // 根据 mode 更新 isDark
  function updateTheme() {
    if (mode.value === 'auto') {
      isDark.value = detectSystemDark()
    } else {
      isDark.value = mode.value === 'dark'
    }
    // 应用到 html/body
    document.documentElement.classList.toggle('dark', isDark.value)
    document.documentElement.classList.toggle('light', !isDark.value)
  }

  // 本地存储
  function saveTheme() {
    localStorage.setItem('theme-mode', mode.value)
  }
  function loadTheme() {
    const saved = localStorage.getItem('theme-mode') as ThemeMode | null
    if (saved) mode.value = saved
    updateTheme()
  }

  // 监听系统主题变化
  let mediaQuery: MediaQueryList | null = null
  function watchSystemTheme() {
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', updateTheme)
    }
  }

  // 初始化
  function init() {
    loadTheme()
    watchSystemTheme()
    watch(mode, updateTheme)
  }

  return { mode, isDark, themeClass, setTheme, init }
})
