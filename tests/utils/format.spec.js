import { describe, it, expect } from 'vitest'
import { formatNumber, shortenHash, timeAgo } from '@/utils/format'

describe('format.js', () => {
  describe('formatNumber', () => {
    it('returns "0" for falsy values', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(null)).toBe('0')
      expect(formatNumber(undefined)).toBe('0')
    })

    it('formats numbers with locale separators', () => {
      expect(formatNumber(1000)).toMatch(/1.?000/)
      expect(formatNumber(1000000)).toMatch(/1.?000.?000/)
    })
  })

  describe('shortenHash', () => {
    it('returns empty string for falsy input', () => {
      expect(shortenHash('')).toBe('')
      expect(shortenHash(null)).toBe('')
    })

    it('shortens hash with default length', () => {
      const hash = '0x1234567890abcdef1234567890abcdef12345678'
      const result = shortenHash(hash)
      expect(result).toBe('0x123456...12345678')
    })

    it('shortens hash with custom length', () => {
      const hash = '0x1234567890abcdef1234567890abcdef12345678'
      const result = shortenHash(hash, 4)
      expect(result).toBe('0x12...5678')
    })
  })

  describe('timeAgo', () => {
    it('returns seconds ago for recent timestamps', () => {
      const now = Date.now()
      expect(timeAgo(now - 30000)).toBe('30s ago')
    })

    it('returns minutes ago', () => {
      const now = Date.now()
      expect(timeAgo(now - 120000)).toBe('2m ago')
    })

    it('returns hours ago', () => {
      const now = Date.now()
      expect(timeAgo(now - 7200000)).toBe('2h ago')
    })

    it('returns days ago', () => {
      const now = Date.now()
      expect(timeAgo(now - 172800000)).toBe('2d ago')
    })
  })
})
