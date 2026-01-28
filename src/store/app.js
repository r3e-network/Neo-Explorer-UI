import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    network: localStorage.getItem('net') || 'mainnet',
    theme: localStorage.getItem('theme') || 'light',
    loading: false
  }),
  
  actions: {
    setNetwork(net) {
      this.network = net
      localStorage.setItem('net', net)
    },
    setTheme(theme) {
      this.theme = theme
      localStorage.setItem('theme', theme)
    },
    setLoading(val) {
      this.loading = val
    }
  }
})
