import { ref, onMounted, onUnmounted } from 'vue'

export function useWebSocket(url) {
  const data = ref(null)
  let ws = null
  
  onMounted(() => {
    ws = new WebSocket(url)
    ws.onmessage = (e) => data.value = JSON.parse(e.data)
  })
  
  onUnmounted(() => ws?.close())
  
  return { data }
}
