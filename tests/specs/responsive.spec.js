import { expect, test } from '@playwright/test';

const galleryViewports = [
  { width: 320, height: 800 },
  { width: 375, height: 667, needsScroll: true },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 844, height: 390, needsScroll: true },
  { width: 1024, height: 768 },
  { width: 1099, height: 768 },
  { width: 1100, height: 768 },
  { width: 1280, height: 720 },
];

async function galleryBounds(page) {
  await expect(page.getByRole('button', { name: '04: Lexography', exact: true })).toBeEnabled();
  return await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const caption = rect('.gallery-caption a:not([hidden])');
    const buttons = rect('.gallery-index');
    const target = rect('.gallery-index button');
    return {
      frameLeft: rect('.gallery-selection').left,
      frameWidth: rect('.gallery-selection').width,
      captionTop: caption.top,
      captionBottom: caption.bottom,
      controlsLeft: buttons.left,
      controlsTop: buttons.top,
      controlsBottom: buttons.bottom,
      controlsRight: buttons.right,
      targetWidth: target.width,
      targetHeight: target.height,
      galleryBottom: rect('.gallery').bottom,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
    };
  });
}

for (const { width, height, needsScroll } of galleryViewports) {
  test('caption and controls stay together at ' + width + ' × ' + height, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const bounds = await galleryBounds(page);
    const gap = bounds.controlsTop - bounds.captionBottom;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(28);
    expect(bounds.targetWidth).toBeGreaterThanOrEqual(43.9);
    expect(bounds.targetHeight).toBeGreaterThanOrEqual(43.9);
    expect(bounds.controlsLeft).toBeGreaterThanOrEqual(0);
    expect(bounds.controlsRight).toBeLessThanOrEqual(bounds.viewportWidth + 1);
    expect(bounds.controlsBottom).toBeLessThanOrEqual(bounds.galleryBottom);
    if (!needsScroll) {
      expect(bounds.captionTop).toBeGreaterThan(0);
      expect(bounds.controlsBottom).toBeLessThanOrEqual(bounds.viewportHeight);
    } else {
      await page.getByRole('group', { name: 'Choose a project' }).scrollIntoViewIfNeeded();
      const gallery = page.getByRole('region', { name: 'Visual studies' });
      await expect(gallery.getByRole('link', { name: 'Lexography', exact: true }))
        .toBeInViewport({ ratio: 1 });
      await expect(gallery.getByRole('group', { name: 'Choose a project' }))
        .toBeInViewport({ ratio: 1 });
    }
  });
}

test('the gallery geometry stays continuous across 1100 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 1099, height: 768 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const before = await galleryBounds(page);
  await page.setViewportSize({ width: 1100, height: 768 });
  await expect.poll(async () => (await galleryBounds(page)).viewportWidth)
    .toBeGreaterThan(before.viewportWidth);
  await expect.poll(async () => {
    const after = await galleryBounds(page);
    const keys = ['frameLeft', 'frameWidth', 'captionTop', 'controlsLeft', 'controlsTop'];
    return Math.max(...keys.map(key => Math.abs(after[key] - before[key])));
  }).toBeLessThan(3);
});

test('portfolio header and footer share the same ultrawide rails', async ({ page }) => {
  await page.setViewportSize({ width: 3440, height: 1440 });
  const readRails = () => page.evaluate(() => {
    const selectors = ['body > header', 'body > footer', '.wordmark', '.main-nav', '.footer-wordmark', '.footer-nav'];
    return selectors.map(selector => {
      const { left, right } = document.querySelector(selector).getBoundingClientRect();
      return [Math.round(left), Math.round(right)];
    });
  });

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const expected = await readRails();
  expect(expected[0][1] - expected[0][0]).toBeGreaterThan(3000);
  expect(expected[0]).toEqual(expected[1]);
  for (const path of ['/about/', '/wip/', '/wip/afterimage/', '/archive/', '/experiments/', '/connect/', '/404.html']) {
    await test.step(path, async () => {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(readRails).toEqual(expected);
    });
  }
});

test('About follows the shared margins and groups its introduction on ultrawide screens', async ({ page }) => {
  await page.goto('/about/');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1100, 1912, 3440, 5120]) {
    await test.step(width + ' pixels wide', async () => {
      await page.setViewportSize({ width, height: 1440 });
      const bounds = await page.evaluate(() => {
        const edges = selector => {
          const { left, right } = document.querySelector(selector).getBoundingClientRect();
          return [Math.round(left), Math.round(right)];
        };
        return {
          header: edges('body > header'),
          intro: edges('.biography-intro'),
          heading: edges('.biography-heading'),
          portrait: edges('.biography-portrait'),
          copy: edges('.biography-copy'),
          conclusion: edges('.biography-conclusion-inner'),
        };
      });

      expect(bounds.copy).toEqual(bounds.header);
      expect(bounds.conclusion).toEqual(bounds.header);
      const gap = bounds.portrait[0] - bounds.heading[1];
      expect(gap).toBeGreaterThan(0);
      if (width < 2400) {
        expect(bounds.intro).toEqual(bounds.header);
      } else {
        expect(gap).toBeLessThan(300);
        expect(bounds.portrait[1]).toBeLessThanOrEqual(bounds.intro[1]);
        expect(bounds.intro[0] - bounds.header[0])
          .toBeCloseTo(bounds.header[1] - bounds.intro[1], -1);
      }
    });
  }
});
