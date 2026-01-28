export function formatNumber(num) {
  if (!num) return '0'
  return num.toLocaleString()
}

export function shortenHash(hash, len = 8) {
  if (!hash) return ''
  return `${hash.slice(0, len)}...${hash.slice(-len)}`
}

export function timeAgo(timestamp) {
  const diff = Date.now() - timestamp
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
