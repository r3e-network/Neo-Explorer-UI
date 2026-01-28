import { describe, it, expect } from 'vitest'
import { isValidHash, isValidAddress, isValidContract } from '@/utils/validate'

describe('validate.js', () => {
  describe('isValidHash', () => {
    it('returns true for valid 64-char hex hash', () => {
      const hash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      expect(isValidHash(hash)).toBe(true)
    })

    it('returns true for hash with 0x prefix', () => {
      const hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      expect(isValidHash(hash)).toBe(true)
    })

    it('returns false for invalid hash', () => {
      expect(isValidHash('invalid')).toBe(false)
      expect(isValidHash('12345')).toBe(false)
    })
  })

  describe('isValidAddress', () => {
    it('returns true for valid Neo address', () => {
      expect(isValidAddress('NXV7ZhHiyM1aHXwpVsRZC6BwNFP2jghXAq')).toBe(true)
    })

    it('returns false for invalid address', () => {
      expect(isValidAddress('invalid')).toBe(false)
      expect(isValidAddress('0x1234')).toBe(false)
    })
  })

  describe('isValidContract', () => {
    it('returns true for valid 40-char contract hash', () => {
      const contract = '1234567890abcdef1234567890abcdef12345678'
      expect(isValidContract(contract)).toBe(true)
    })

    it('returns true for contract with 0x prefix', () => {
      const contract = '0x1234567890abcdef1234567890abcdef12345678'
      expect(isValidContract(contract)).toBe(true)
    })

    it('returns false for invalid contract', () => {
      expect(isValidContract('invalid')).toBe(false)
    })
  })
})
