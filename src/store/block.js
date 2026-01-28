import { defineStore } from 'pinia'
import { blockService } from '@/services'

export const useBlockStore = defineStore('block', {
  state: () => ({
    blocks: [],
    total: 0,
    current: null,
    loading: false
  }),
  
  actions: {
    async fetchList(limit = 20, skip = 0) {
      this.loading = true
      try {
        const res = await blockService.getList(limit, skip)
        this.blocks = res?.result || []
        this.total = res?.totalCount || 0
      } finally {
        this.loading = false
      }
    },
    async fetchByHash(hash) {
      this.loading = true
      try {
        this.current = await blockService.getByHash(hash)
      } finally {
        this.loading = false
      }
    }
  }
})
