import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page, testInfo) {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const resultPath = testInfo.outputPath('axe-results.json');
  await writeFile(resultPath, JSON.stringify(results, null, 2));
  await testInfo.attach('axe-results', { path: resultPath, contentType: 'application/json' });
  const violations = results.violations.map(({ id, nodes }) => ({
    rule: id,
    elements: nodes.map(node => node.target),
  }));
  expect(violations).toEqual([]);
}

const routes = [
  '/', '/about/', '/wip/', '/wip/lexography/', '/wip/afterimage/',
  '/wip/naraeology/', '/wip/cosmoture/', '/archive/', '/experiments/', '/connect/',
];

for (const path of routes) {
  test('axe on ' + path, async ({ page }, testInfo) => {
    await page.goto(path);
    if (path === '/') {
      await expect(page.getByRole('button', { name: '04: Lexography', exact: true })).toBeEnabled();
    }
    await scan(page, testInfo);
  });
}

test('axe on the mobile homepage with Afterimage selected', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const gallery = page.getByRole('region', { name: 'Visual studies' });
  await gallery.getByRole('button', { name: '01: Afterimage' }).click();
  await expect(gallery.getByRole('link', { name: 'Afterimage', exact: true })).toBeVisible();
  await scan(page, testInfo);
});

test('axe on the open Connect dialog', async ({ page }, testInfo) => {
  await page.goto('/about/');
  await page.getByRole('link', { name: 'Get in touch.', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Connect/ });
  await expect(dialog).toHaveCSS('opacity', '1');
  await scan(page, testInfo);
});

test('holding a Connect dialog link preserves its text contrast', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');
  await page.getByRole('link', { name: 'Get in touch.', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Connect/ });
  await expect(dialog).toHaveCSS('opacity', '1');
  const link = dialog.getByRole('link', { name: 'LinkedIn', exact: true });
  await link.hover();
  await page.mouse.down();
  try {
    await expect(link).toHaveCSS('opacity', '1');
  } finally {
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
});
