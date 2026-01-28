import { describe, it, expect } from 'vitest';
import {
  numFormat,
  convertToken,
  convertGas,
  convertTotalSupply,
  changeFormat,
  switchTime,
  convertISOTime,
} from '../../src/store/util';

describe('store/util', () => {
  describe('numFormat', () => {
    it('formats small numbers without commas', () => {
      expect(numFormat(123)).toBe('123');
    });

    it('formats thousands with commas', () => {
      expect(numFormat(1234)).toBe('1,234');
    });

    it('formats millions with commas', () => {
      expect(numFormat(1234567)).toBe('1,234,567');
    });

    it('formats decimal numbers', () => {
      expect(numFormat(1234.56)).toBe('1,234.56');
    });
  });

  describe('convertToken', () => {
    it('converts token with 8 decimals', () => {
      expect(convertToken(100000000, 8)).toBe('1');
    });

    it('converts token with 0 decimals', () => {
      expect(convertToken(100, 0)).toBe('100');
    });
  });

  describe('convertGas', () => {
    it('converts gas value correctly', () => {
      expect(convertGas(100000000)).toBe('1');
    });

    it('converts small gas value', () => {
      expect(convertGas(10000000)).toBe('0.1');
    });
  });

  describe('convertTotalSupply', () => {
    it('converts total supply with decimals', () => {
      expect(convertTotalSupply(100000000, 8)).toBe('1');
    });
  });

  describe('changeFormat', () => {
    it('toggles state from true to false', () => {
      const button = { state: true, buttonName: 'Hash' };
      changeFormat(button);
      expect(button.state).toBe(false);
      expect(button.buttonName).toBe('Addr');
    });

    it('toggles state from false to true', () => {
      const button = { state: false, buttonName: 'Addr' };
      changeFormat(button);
      expect(button.state).toBe(true);
      expect(button.buttonName).toBe('Hash');
    });
  });

  describe('switchTime', () => {
    it('toggles time state from true to false', () => {
      const time = { state: true };
      switchTime(time);
      expect(time.state).toBe(false);
    });

    it('toggles time state from false to true', () => {
      const time = { state: false };
      switchTime(time);
      expect(time.state).toBe(true);
    });
  });

  describe('convertISOTime', () => {
    it('formats timestamp to ISO format', () => {
      // Use a fixed timestamp: 2024-01-15 10:30:45
      const timestamp = new Date(2024, 0, 15, 10, 30, 45).getTime();
      const result = convertISOTime(timestamp);
      expect(result).toBe('2024-01-15 10:30:45');
    });

    it('pads single digit values with zeros', () => {
      // 2024-01-05 09:05:05
      const timestamp = new Date(2024, 0, 5, 9, 5, 5).getTime();
      const result = convertISOTime(timestamp);
      expect(result).toBe('2024-01-05 09:05:05');
    });
  });
});
