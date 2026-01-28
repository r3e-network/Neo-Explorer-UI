import { describe, it, expect } from 'vitest'
import { randomString } from '@/utils/stringUtils'

describe('stringUtils.js', () => {
  describe('randomString', () => {
    it('generates string of default length 7', () => {
      const result = randomString()
      expect(result.length).toBe(7)
    })

    it('generates string of custom length', () => {
      expect(randomString(10).length).toBe(10)
      expect(randomString(3).length).toBe(3)
    })

    it('contains only alphabetic characters', () => {
      const result = randomString(100)
      expect(/^[a-zA-Z]+$/.test(result)).toBe(true)
    })

    it('generates different strings each time', () => {
      const a = randomString(20)
      const b = randomString(20)
      expect(a).not.toBe(b)
    })
  })
})
