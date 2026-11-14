import { expect, test } from '@playwright/test';

test.describe('screenshot comparisons', { tag: '@visual' }, () => {
  test.use({ reducedMotion: 'reduce' });

  for (const { width, height } of [
    { width: 390, height: 844 },
    { width: 1099, height: 768 },
    { width: 1100, height: 768 },
    { width: 1912, height: 914 },
  ]) {
    test('homepage gallery at ' + width + ' × ' + height, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page.getByRole('button', { name: '04: Lexography', exact: true })).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot('home-' + width + '.png');
    });
  }

  test('open Connect dialog on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/about/');
    await page.getByRole('link', { name: 'Get in touch.', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: /Connect/ });
    await expect(dialog).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(dialog).toHaveScreenshot('connect-dialog-390.png');
  });
});
