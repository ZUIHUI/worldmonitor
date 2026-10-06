import { expect, test } from '@playwright/test';

const languageCases = [
  { locale: 'zh-TW', language: 'zh-TW', htmlLang: 'zh-TW', settings: '設定' },
  { locale: 'zh-Hant', language: 'zh-TW', htmlLang: 'zh-TW', settings: '設定' },
  { locale: 'zh-Hant-HK', language: 'zh-TW', htmlLang: 'zh-TW', settings: '設定' },
  { locale: 'zh-HK', language: 'zh-TW', htmlLang: 'zh-TW', settings: '設定' },
  { locale: 'zh-MO', language: 'zh-TW', htmlLang: 'zh-TW', settings: '設定' },
  { locale: 'zh-CN', language: 'zh', htmlLang: 'zh-CN', settings: '设置' },
  { locale: 'zh-Hans-TW', language: 'zh', htmlLang: 'zh-CN', settings: '设置' },
  { locale: 'zh', language: 'zh', htmlLang: 'zh-CN', settings: '设置' },
  { locale: 'en-US', language: 'en', htmlLang: 'en', settings: 'SETTINGS' },
  { locale: 'fr-CA', language: 'fr', htmlLang: 'fr', settings: 'PARAMÈTRES' },
];

for (const languageCase of languageCases) {
  test.describe(`browser language ${languageCase.locale}`, () => {
    test.use({ locale: languageCase.locale });

    test('loads the correct dictionary and document language', async ({ page }) => {
      await page.goto('/tests/runtime-harness.html');
      const result = await page.evaluate(async () => {
        const i18n = await import('/src/services/i18n.ts');
        await i18n.initI18n();
        return { language: i18n.getCurrentLanguage(), locale: i18n.getLocale(), settings: i18n.t('header.settings') };
      });
      expect(result.language).toBe(languageCase.language);
      expect(result.settings).toBe(languageCase.settings);
      if (languageCase.language === 'zh-TW') expect(result.locale).toBe('zh-TW');
      await expect(page.locator('html')).toHaveAttribute('lang', languageCase.htmlLang);
    });
  });
}

test('saved Traditional Chinese preference overrides an English browser and survives switching', async ({ page }) => {
  await page.goto('/tests/runtime-harness.html');
  await page.evaluate(() => localStorage.setItem('i18nextLng', 'zh-TW'));
  const initialize = () => page.evaluate(async () => {
    const i18n = await import('/src/services/i18n.ts');
    await i18n.initI18n();
    return { language: i18n.getCurrentLanguage(), settings: i18n.t('header.settings') };
  });
  expect(await initialize()).toEqual({ language: 'zh-TW', settings: '設定' });
  await page.reload();
  expect(await initialize()).toEqual({ language: 'zh-TW', settings: '設定' });
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(async () => (await import('/src/services/i18n.ts')).changeLanguage('zh')),
  ]);
  expect(await initialize()).toEqual({ language: 'zh', settings: '设置' });
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(async () => (await import('/src/services/i18n.ts')).changeLanguage('zh-TW')),
  ]);
  expect(await initialize()).toEqual({ language: 'zh-TW', settings: '設定' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
});

test('switching from Arabic to Traditional Chinese clears RTL direction', async ({ page }) => {
  await page.goto('/tests/runtime-harness.html');
  await page.evaluate(async () => {
    localStorage.setItem('i18nextLng', 'ar');
    await (await import('/src/services/i18n.ts')).initI18n();
  });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(async () => (await import('/src/services/i18n.ts')).changeLanguage('zh-TW')),
  ]);
  await page.evaluate(async () => (await import('/src/services/i18n.ts')).initI18n());
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
});

test('settings menu selects Traditional Chinese and retains it after reload', async ({ page }) => {
  // Keep unavailable live services from occupying the dev server's HTTP connections
  // while the browser lazy-loads the selected locale.
  await page.route('**/api/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{}',
  }));
  await page.goto('/');
  await page.locator('#unifiedSettingsBtn').click();
  await expect(page.locator('#us-language option[value="zh-TW"]')).toHaveText('🇹🇼 繁體中文');
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('#us-language').selectOption('zh-TW'),
  ]);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page.locator('#unifiedSettingsBtn')).toHaveAttribute('aria-label', '設定');
  await page.locator('#unifiedSettingsBtn').click();
  await expect(page.locator('#us-language')).toHaveValue('zh-TW');
});
