import { expect, test } from '@playwright/test';

const projects = [
  { name: 'Lexography', slug: 'lexography', next: 'Visit Lexography', url: 'https://lexography.org/' },
  { name: 'Afterimage', slug: 'afterimage', next: 'Visit Afterimage', url: 'https://afterimage.markmathew.com/' },
  {
    name: 'Naraeology', slug: 'naraeology',
    next: 'Explore the Naraeology proof of concept', url: 'https://markusimperative.github.io/naraeology/',
  },
  {
    name: 'Cosmoture', slug: 'cosmoture',
    next: 'View the Windows prototype source', url: 'https://github.com/markusimperative/cosmoture',
  },
];

for (const { name, slug, next, url } of projects) {
  const storyPath = '/wip/' + slug + '/';

  test('WIP opens the ' + name + ' story', async ({ page }) => {
    await page.goto('/wip/');
    const main = page.getByRole('main');
    const row = main.getByRole('link').filter({
      has: page.getByRole('heading', { name, exact: true, level: 3 }),
    });
    await expect(row).toHaveAccessibleName(new RegExp('^PROJECT STORY ' + name + '.* Read$'));
    await expect(row).toHaveAttribute('href', storyPath);

    if (slug === 'lexography') {
      const feature = main.getByRole('article', { name: /^Lexography/ });
      const links = feature.getByRole('link', { name: 'Read the Lexography story', exact: true });
      await expect(links).toHaveCount(2);
      for (const link of await links.all()) await expect(link).toHaveAttribute('href', storyPath);
    }

    await row.click();
    await expect(page).toHaveURL(storyPath);
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: next, exact: true })).toHaveAttribute('href', url);
    await page.getByRole('link', { name: 'Back to WIP', exact: true }).click();
    await expect(page).toHaveURL('/wip/');
  });
}

for (const { name, slug } of projects.slice(0, 2)) {
  test('Home images and text open the ' + name + ' story', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore selected work', exact: true }).click();
    await expect(page).toHaveURL('/#in-view');
    const card = page.getByRole('region', { name: 'In view', exact: true })
      .getByRole('article', { name, exact: true });
    const links = card.getByRole('link', { name: 'Read the ' + name + ' story', exact: true });
    const storyPath = '/wip/' + slug + '/';
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('href', storyPath);
      await link.click();
      await expect(page).toHaveURL(storyPath);
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
      await page.goBack();
    }
  });
}

test('Archive opens Iris and offers a return to Archive', async ({ page }) => {
  await page.goto('/archive/');
  const iris = page.getByRole('link', { name: /^Camera concept Iris .* Explore$/ });
  await expect(iris).toHaveAttribute('href', '/archive/iris/');
  await iris.click();
  await expect(page).toHaveURL('/archive/iris/');
  await expect(page.getByRole('navigation', { name: 'Main', exact: true })
    .getByRole('link', { name: 'Archive', exact: true })).toHaveAttribute('aria-current', 'location');
  await page.getByRole('link', { name: 'Back to Archive', exact: true }).click();
  await expect(page).toHaveURL('/archive/');
});

test('Experiments distinguishes the playable prototype from the live site', async ({ page }) => {
  await page.goto('/experiments/');
  const counter = page.getByRole('article', { name: 'The Counter', exact: true });
  await expect(counter.getByText('Playable prototype', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: /^LIVE Timempathy .* Visit$/ }))
    .toHaveAttribute('href', 'https://timempathy.markmathew.com/');
  await expect(page.getByRole('link', { name: /^PLAYABLE PROTOTYPE The Counter .* Enter$/ }))
    .toHaveAttribute('href', '/experiments/the-counter/');
  await counter.getByRole('link', { name: 'Enter The Counter', exact: true }).click();
  await expect(page).toHaveURL('/experiments/the-counter/');
  await expect(page.getByRole('button', { name: 'Begin shift' })).toBeEnabled();
});

test('Paralayer has a status and no launch action', async ({ page }) => {
  await page.goto('/wip/');
  const entry = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'Paralayer', exact: true }),
  });
  await expect(entry.getByText('COMING SOON', { exact: true })).toBeVisible();
  await expect(entry.getByRole('link').or(entry.getByRole('button'))).toHaveCount(0);
});

test.describe('contact fallback', () => {
  test.use({ javaScriptEnabled: false });

  test('the About contact link works with JavaScript disabled', async ({ page }) => {
    await page.goto('/about/');
    await page.getByRole('link', { name: 'Get in touch.' }).click();
    await expect(page).toHaveURL('/connect/');
    await expect(page.getByRole('heading', { name: 'Connect', level: 1 })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: /LinkedIn/ }))
      .toHaveAttribute('href', /^https:\/\/www\.linkedin\.com\/in\//);
  });
});
