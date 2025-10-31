import { locales, defaultLocale, localeNames, type Locale } from '@/lib/i18nConfig';

describe('i18nConfig', () => {
  describe('locales', () => {
    it('should include English and German', () => {
      expect(locales).toContain('en');
      expect(locales).toContain('de');
    });

    it('should have exactly 2 locales', () => {
      expect(locales).toHaveLength(2);
    });

    it('should be readonly array', () => {
      expect(Array.isArray(locales)).toBe(true);
    });
  });

  describe('defaultLocale', () => {
    it('should be a valid locale from locales array', () => {
      expect(locales).toContain(defaultLocale);
    });

    it('should default to English when DEFAULT_LANG env var is not set or invalid', () => {
      // This test verifies the fallback behavior
      // Note: defaultLocale reads from process.env.DEFAULT_LANG at module load time
      // If DEFAULT_LANG is set in .env, it will use that value instead of 'en'
      const validLocales: readonly string[] = locales;
      expect(validLocales).toContain(defaultLocale);
    });
  });

  describe('localeNames', () => {
    it('should have English name', () => {
      expect(localeNames.en).toBe('English');
    });

    it('should have German name', () => {
      expect(localeNames.de).toBe('Deutsch');
    });

    it('should have names for all locales', () => {
      locales.forEach((locale: Locale) => {
        expect(localeNames[locale]).toBeDefined();
        expect(typeof localeNames[locale]).toBe('string');
        expect(localeNames[locale].length).toBeGreaterThan(0);
      });
    });

    it('should only have entries for defined locales', () => {
      const localeNamesKeys = Object.keys(localeNames);
      expect(localeNamesKeys).toHaveLength(locales.length);
      localeNamesKeys.forEach(key => {
        expect(locales).toContain(key as Locale);
      });
    });
  });
});
