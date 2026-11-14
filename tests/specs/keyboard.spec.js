import { expect, test } from '@playwright/test';

test('skip link takes keyboard focus to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/#main');
  await expect(page.getByRole('main')).toBeFocused();
});

for (const motion of ['no-preference', 'reduce']) {
  test.describe('gallery keyboard with reduced motion set to ' + motion, () => {
    test.use({ reducedMotion: motion });

    test('selection, tab order, and the selected link stay in sync', async ({ page }) => {
      await page.goto('/');
      const gallery = page.getByRole('region', { name: 'Visual studies', exact: true });
      const button = name => gallery.getByRole('button', { name });
      const lexography = button('04: Lexography');
      await expect(lexography).toBeEnabled();
      await expect(gallery.getByRole('link')).toHaveCount(1);

      await page.getByRole('link', { name: 'Explore selected work', exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(lexography).toBeFocused();
      await expect(lexography).toHaveAttribute('aria-pressed', 'true');

      const steps = [
        ['Home', '01: Afterimage'],
        ['ArrowRight', '02: Naraeology'],
        ['End', '05: The Counter'],
        ['ArrowLeft', '04: Lexography'],
      ];
      for (const [key, name] of steps) {
        await page.keyboard.press(key);
        await expect(button(name)).toBeFocused();
        await expect(button(name)).toHaveAttribute('aria-pressed', 'true');
      }
      await page.keyboard.press('Tab');
      const caption = gallery.getByRole('link', { name: 'Lexography', exact: true });
      await expect(caption).toBeFocused();
      await expect(caption).toBeInViewport();
      await expect(caption).toHaveCSS('outline-style', 'solid');
      await expect(caption).toHaveAccessibleDescription(/Letterpress A and g/);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/wip/lexography/');
    });
  });
}

test('a quick Tab opens the latest gallery choice while artwork is moving', async ({ page }) => {
  await page.goto('/');
  const gallery = page.getByRole('region', { name: 'Visual studies', exact: true });
  const lexography = gallery.getByRole('button', { name: '04: Lexography', exact: true });
  await expect(lexography).toBeEnabled();
  await lexography.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Tab');
  await expect(gallery.getByRole('button', { name: '01: Afterimage', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
  const caption = gallery.getByRole('link', { name: 'Afterimage', exact: true });
  await expect(caption).toBeFocused();
  await expect(caption).toHaveAccessibleDescription(/cracked plaster profile/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/wip/afterimage/');
});

for (const [path, triggerName, lastName] of [
  ['/', 'Start a conversation', 'About & contact'],
  ['/about/', 'Get in touch.', 'GitHub'],
]) {
  test('Connect wraps focus and returns it to the trigger on ' + path, async ({ page }) => {
    await page.goto(path);
    const trigger = page.getByRole('link', { name: triggerName, exact: true });
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(trigger).toHaveAttribute('aria-controls', 'connect-dialog');
    await trigger.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: /Connect/ });
    const close = dialog.getByRole('button', { name: 'Close Connect', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('id', 'connect-dialog');
    await expect(close).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', { name: lastName, exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('link', { name: 'LinkedIn', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
}

test.describe('mobile touch', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('a numbered control can be tapped without leaving the gallery', async ({ page }) => {
    await page.goto('/');
    const gallery = page.getByRole('region', { name: 'Visual studies', exact: true });
    const button = gallery.getByRole('button', { name: '01: Afterimage' });
    await expect(button).toBeEnabled();
    await expect(button).toBeInViewport({ ratio: 1 });
    await button.tap();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    const caption = gallery.getByRole('link', { name: 'Afterimage', exact: true });
    await expect(caption).toBeInViewport({ ratio: 1 });
    await expect(caption).toHaveAccessibleDescription(/cracked plaster profile/);
    await expect(caption).toHaveAttribute('href', '/wip/afterimage/');
    await expect(page).toHaveURL('/');
  });

  test('Connect opens and dismisses by touch', async ({ page }) => {
    await page.goto('/about/');
    const trigger = page.getByRole('link', { name: 'Get in touch.', exact: true });
    const dialog = page.getByRole('dialog', { name: /Connect/ });
    await trigger.tap();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Close Connect', exact: true }).tap();
    await expect(dialog).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.tap();
    await expect(dialog).toBeVisible();
    const { x, y, width } = await dialog.boundingBox();
    await page.touchscreen.tap(x + width / 2, y / 2);
    await expect(dialog).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
