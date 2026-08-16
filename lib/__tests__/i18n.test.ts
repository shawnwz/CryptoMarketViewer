import { isSupportedLanguage, SUPPORTED_LANGUAGES } from '../i18n';

describe('isSupportedLanguage', () => {
  it('accepts every language the app ships translations for', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(isSupportedLanguage(lang)).toBe(true);
    }
  });

  it('rejects languages without translations', () => {
    expect(isSupportedLanguage('fr')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isSupportedLanguage('')).toBe(false);
  });
});
