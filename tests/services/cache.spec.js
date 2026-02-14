import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the env module before importing cache
vi.mock('@/utils/env', () => ({
  getCurrentEnv: vi.fn(() => 'Mainnet'),
}))

import {
  getCacheKey,
  getCache,
  setCache,
  clearCache,
  clearAllCache,
  clearCacheByPrefix,
  cachedRequest,
  getCacheMeta,
  isCacheFresh,
  getCacheStats,
  CACHE_TTL,
  MAX_CACHE_SIZE,
} from '@/services/cache'

import { getCurrentEnv } from '@/utils/env'

describe('cache service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearAllCache()
    getCurrentEnv.mockReturnValue('Mainnet')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── getCacheKey ──────────────────────────────────────────────

  describe('getCacheKey', () => {
    it('generates consistent keys for the same inputs', () => {
      const a = getCacheKey('getBlock', { height: 1 })
      const b = getCacheKey('getBlock', { height: 1 })
      expect(a).toBe(b)
    })

    it('generates different keys for different methods', () => {
      const a = getCacheKey('getBlock', { height: 1 })
      const b = getCacheKey('getTx', { height: 1 })
      expect(a).not.toBe(b)
    })

    it('generates different keys for different params', () => {
      const a = getCacheKey('getBlock', { height: 1 })
      const b = getCacheKey('getBlock', { height: 2 })
      expect(a).not.toBe(b)
    })

    it('produces the same key regardless of param insertion order', () => {
      const a = getCacheKey('list', { page: 1, size: 10 })
      const b = getCacheKey('list', { size: 10, page: 1 })
      expect(a).toBe(b)
    })

    it('includes the current network in the key', () => {
      getCurrentEnv.mockReturnValue('TestT5')
      const key = getCacheKey('getBlock', { height: 1 })
      expect(key).toContain('TestT5')
    })

    it('defaults params to empty object', () => {
      const key = getCacheKey('stats')
      expect(key).toBe('Mainnet:stats:{}')
    })
  })

  // ── setCache / getCache ──────────────────────────────────────

  describe('setCache / getCache', () => {
    it('stores and retrieves data', () => {
      setCache('k1', { value: 42 })
      expect(getCache('k1')).toEqual({ value: 42 })
    })

    it('returns null for a cache miss', () => {
      expect(getCache('nonexistent')).toBeNull()
    })

    it('stores falsy values correctly', () => {
      setCache('zero', 0)
      setCache('empty', '')
      setCache('bool', false)

      expect(getCache('zero')).toBe(0)
      expect(getCache('empty')).toBe('')
      expect(getCache('bool')).toBe(false)
    })
  })

  // ── TTL expiry ───────────────────────────────────────────────

  describe('TTL behaviour', () => {
    it('returns data before TTL expires', () => {
      setCache('ttl-test', 'fresh', 5000)
      vi.advanceTimersByTime(4999)
      expect(getCache('ttl-test')).toBe('fresh')
    })

    it('returns null after TTL expires', () => {
      setCache('ttl-test', 'stale', 5000)
      vi.advanceTimersByTime(5001)
      expect(getCache('ttl-test')).toBeNull()
    })

    it('uses default TTL when none is specified', () => {
      setCache('def-ttl', 'data')
      // Default TTL is block = 15000ms
      vi.advanceTimersByTime(14999)
      expect(getCache('def-ttl')).toBe('data')
      vi.advanceTimersByTime(2)
      expect(getCache('def-ttl')).toBeNull()
    })
  })

  // ── getCacheMeta ─────────────────────────────────────────────

  describe('getCacheMeta', () => {
    it('returns null for missing key', () => {
      expect(getCacheMeta('nope')).toBeNull()
    })

    it('returns metadata for a cached entry', () => {
      const now = Date.now()
      setCache('meta-key', 'payload', 10000)
      const meta = getCacheMeta('meta-key')

      expect(meta).not.toBeNull()
      expect(meta.key).toBe('meta-key')
      expect(meta.data).toBe('payload')
      expect(meta.ttl).toBe(10000)
      expect(meta.timestamp).toBeGreaterThanOrEqual(now)
      expect(meta.age).toBeGreaterThanOrEqual(0)
      expect(meta.remaining).toBeLessThanOrEqual(10000)
    })

    it('returns null for expired entry', () => {
      setCache('meta-exp', 'old', 1000)
      vi.advanceTimersByTime(1001)
      expect(getCacheMeta('meta-exp')).toBeNull()
    })
  })

  // ── isCacheFresh ─────────────────────────────────────────────

  describe('isCacheFresh', () => {
    it('returns false for missing key', () => {
      expect(isCacheFresh('missing')).toBe(false)
    })

    it('returns true when entry is within freshness window', () => {
      setCache('fresh-check', 'data', 60000)
      vi.advanceTimersByTime(1000)
      expect(isCacheFresh('fresh-check', 5000)).toBe(true)
    })

    it('returns false when entry exceeds freshness window', () => {
      setCache('fresh-check2', 'data', 60000)
      vi.advanceTimersByTime(6000)
      expect(isCacheFresh('fresh-check2', 5000)).toBe(false)
    })
  })

  // ── clearCache / clearAllCache / clearCacheByPrefix ──────────

  describe('cache invalidation', () => {
    it('clearCache removes a single entry', () => {
      setCache('a', 1)
      setCache('b', 2)
      clearCache('a')
      expect(getCache('a')).toBeNull()
      expect(getCache('b')).toBe(2)
    })

    it('clearAllCache removes all entries', () => {
      setCache('x', 1)
      setCache('y', 2)
      clearAllCache()
      expect(getCache('x')).toBeNull()
      expect(getCache('y')).toBeNull()
    })

    it('clearCacheByPrefix removes matching entries only', () => {
      setCache('block:1', 'a')
      setCache('block:2', 'b')
      setCache('tx:1', 'c')
      clearCacheByPrefix('block:')
      expect(getCache('block:1')).toBeNull()
      expect(getCache('block:2')).toBeNull()
      expect(getCache('tx:1')).toBe('c')
    })
  })

  // ── cachedRequest ────────────────────────────────────────────

  describe('cachedRequest', () => {
    it('calls fetchFn on cache miss and caches the result', async () => {
      const fetchFn = vi.fn().mockResolvedValue('result')
      const data = await cachedRequest('req1', fetchFn, 5000)

      expect(data).toBe('result')
      expect(fetchFn).toHaveBeenCalledOnce()
      expect(getCache('req1')).toBe('result')
    })

    it('returns cached data on cache hit without calling fetchFn', async () => {
      setCache('req2', 'cached-value', 5000)
      const fetchFn = vi.fn()
      const data = await cachedRequest('req2', fetchFn, 5000)

      expect(data).toBe('cached-value')
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('calls fetchFn when forceRefresh is true even if cached', async () => {
      setCache('req3', 'old', 5000)
      const fetchFn = vi.fn().mockResolvedValue('new')
      const data = await cachedRequest('req3', fetchFn, 5000, { forceRefresh: true })

      expect(data).toBe('new')
      expect(fetchFn).toHaveBeenCalledOnce()
    })

    it('deduplicates concurrent identical requests', async () => {
      let resolvePromise
      const fetchFn = vi.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const p1 = cachedRequest('dedup', fetchFn, 5000)
      const p2 = cachedRequest('dedup', fetchFn, 5000)

      // Only one fetch should have been initiated
      expect(fetchFn).toHaveBeenCalledOnce()

      resolvePromise('shared')
      const [r1, r2] = await Promise.all([p1, p2])
      expect(r1).toBe('shared')
      expect(r2).toBe('shared')
    })

    it('cleans up pending request on fetch error', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('network'))

      await expect(cachedRequest('err-key', fetchFn, 5000)).rejects.toThrow('network')

      // A subsequent call should retry (not reuse the failed promise)
      const fetchFn2 = vi.fn().mockResolvedValue('recovered')
      const data = await cachedRequest('err-key', fetchFn2, 5000)
      expect(data).toBe('recovered')
    })

    it('triggers background revalidation with staleWhileRevalidate', async () => {
      setCache('swr-key', 'stale-data', 20000)
      vi.advanceTimersByTime(15000) // age > softTtl of 10000

      const fetchFn = vi.fn().mockResolvedValue('refreshed')
      const data = await cachedRequest('swr-key', fetchFn, 20000, {
        staleWhileRevalidate: true,
        softTtl: 10000,
      })

      // Should return stale data immediately
      expect(data).toBe('stale-data')
      // Background fetch should have been triggered
      expect(fetchFn).toHaveBeenCalledOnce()

      // Let the background promise resolve
      await vi.runAllTimersAsync()
      // Now cache should have the refreshed value
      expect(getCache('swr-key')).toBe('refreshed')
    })

    it('calls onBackgroundRefreshError when background revalidation fails', async () => {
      setCache('swr-err', 'stale', 60000)
      vi.advanceTimersByTime(30000) // age > softTtl

      const errorHandler = vi.fn()
      const fetchFn = vi.fn().mockRejectedValue(new Error('bg-fail'))

      await cachedRequest('swr-err', fetchFn, 60000, {
        staleWhileRevalidate: true,
        softTtl: 5000,
        onBackgroundRefreshError: errorHandler,
      })

      await vi.runAllTimersAsync()
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  // ── getCacheStats ────────────────────────────────────────────

  describe('getCacheStats', () => {
    it('tracks hits and misses', async () => {
      const fetchFn = vi.fn().mockResolvedValue('v')

      // miss
      await cachedRequest('stat-key', fetchFn, 5000)
      // hit
      await cachedRequest('stat-key', fetchFn, 5000)

      const stats = getCacheStats()
      expect(stats.hits).toBeGreaterThanOrEqual(1)
      expect(stats.misses).toBeGreaterThanOrEqual(1)
      expect(stats.total).toBeGreaterThanOrEqual(1)
    })
  })

  // ── LRU eviction ─────────────────────────────────────────────

  describe('LRU eviction', () => {
    it('evicts the oldest entry when MAX_CACHE_SIZE is reached', () => {
      // Fill cache to the limit
      for (let i = 0; i < MAX_CACHE_SIZE; i++) {
        setCache(`lru-${i}`, i, 60000)
      }

      // Adding one more should evict the first entry
      setCache('lru-new', 'new', 60000)
      expect(getCache('lru-0')).toBeNull()
      expect(getCache('lru-new')).toBe('new')
    })
  })

  // ── CACHE_TTL / LEGACY_TTL proxy ─────────────────────────────

  describe('CACHE_TTL', () => {
    it('exposes standard TTL values', () => {
      expect(CACHE_TTL.block).toBe(15000)
      expect(CACHE_TTL.txDetail).toBe(60000)
      expect(CACHE_TTL.contract).toBe(300000)
      expect(CACHE_TTL.token).toBe(120000)
      expect(CACHE_TTL.stats).toBe(30000)
    })

    it('resolves deprecated aliases with a warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const val = CACHE_TTL.list // deprecated alias for "block"
      expect(val).toBe(CACHE_TTL.block)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"list" is deprecated')
      )
    })

    it('returns undefined for unknown keys', () => {
      expect(CACHE_TTL.nonexistent).toBeUndefined()
    })
  })

  // ── MAX_CACHE_SIZE export ────────────────────────────────────

  describe('MAX_CACHE_SIZE', () => {
    it('is exported as 500', () => {
      expect(MAX_CACHE_SIZE).toBe(500)
    })
  })
})
