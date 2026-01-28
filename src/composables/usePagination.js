import { ref } from 'vue'

export function usePagination(fetchFn, limit = 20) {
  const page = ref(1)
  const total = ref(0)
  
  const next = () => { page.value++; fetchFn() }
  const prev = () => { if (page.value > 1) { page.value--; fetchFn() } }
  
  return { page, total, next, prev }
}
