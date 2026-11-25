import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const field = (page: Page) => page.getByRole('img', { name: /Your playing field/ });
const chooseMode = async (page: Page, name: string) => {
  await page.getByRole('button', { name: /\bMode\b/ }).click();
  await page.getByRole('option', { name, exact: true }).click();
};
const occupiedCells = (page: Page) => field(page).locator('[data-cell]:not([data-cell="empty"])');
const columns = (page: Page) => field(page).locator('[data-cell]').evaluateAll((cells) =>
  cells.flatMap((cell, index) => cell.hasAttribute('data-falling') ? index % 10 : []),
);
const dropUntilOut = async (page: Page) => {
  const gameOver = page.getByText('Game over', { exact: true });
  const settled = occupiedCells(page).and(page.locator(':not([data-falling])'));
  for (let step = 0; step < 25 && !await gameOver.isVisible(); step++) {
    const before = await settled.count();
    await page.keyboard.press('Space');
    await expect.poll(async () => await gameOver.isVisible() || await settled.count() > before).toBe(true);
  }
  await expect(gameOver).toBeVisible();
};

test('opens a production deep link and plays and restarts a solo Classic round', async ({ page }, info) => {
  const room = 'Friday Arcade ' + info.repeatEachIndex;
  await page.goto('/' + encodeURIComponent(room) + '/Ada');
  await expect(page.getByRole('heading', { name: room })).toBeVisible();
  await expect(field(page).locator('[data-cell]')).toHaveCount(200);
  await page.getByRole('button', { name: 'Start round' }).click();
  await expect(page.getByText('Classic · Solo')).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(occupiedCells(page)).toHaveCount(4);
  const startingColumns = await columns(page);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => columns(page)).toEqual(startingColumns.map((x) => x - 1));
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowDown');
  // Centered hard drops necessarily top out without clearing a line.
  await dropUntilOut(page);
  await page.getByRole('button', { name: 'Start next round' }).click();
  await expect(occupiedCells(page)).toHaveCount(4);
});

test('shows live spectra, isolates rooms, and transfers host and restart controls', async ({ browser }, info) => {
  const first = await browser.newPage();
  const second = await browser.newPage();
  const other = await browser.newPage();
  const room = '/Duel' + info.repeatEachIndex;
  try {
    await first.goto(room + '/Ada');
    await expect(first.getByRole('button', { name: 'Start round' })).toBeVisible();
    await second.goto(room + '/Ben');
    await other.goto('/Other' + info.repeatEachIndex + '/Cleo');
    const opponent = second.getByRole('img', { name: /Ada column heights/ });
    await expect(opponent).toHaveAccessibleName('Ada column heights: 0, 0, 0, 0, 0, 0, 0, 0, 0, 0');
    await first.getByRole('button', { name: 'Start round' }).click();
    await expect(second.getByText('Classic · Multiplayer')).toBeVisible();
    await expect(field(first)).toBeFocused();
    await first.keyboard.press('Space');
    await expect(opponent).not.toHaveAccessibleName('Ada column heights: 0, 0, 0, 0, 0, 0, 0, 0, 0, 0');
    await expect(other.getByText('Waiting to start')).toBeVisible();
    await first.close();
    await expect(second.getByText('Ben wins')).toBeVisible();
    await second.getByRole('button', { name: 'Start next round' }).click();
    await expect(second.getByText('Classic · Solo')).toBeVisible();
  } finally {
    await Promise.all([first.close(), second.close(), other.close()]);
  }
});

test('plays the bonus modes and loads scores from the persistent leaderboard', async ({ page }, info) => {
  const room = '/Bonus' + info.repeatEachIndex;
  const name = 'Dana' + info.repeatEachIndex;
  await page.goto(room + '/' + name);
  await chooseMode(page, 'Invisible Pieces');
  await page.getByRole('button', { name: 'Start round' }).click();
  await expect(page.getByText('Invisible Pieces · Solo')).toBeVisible();
  await expect(occupiedCells(page)).toHaveCount(0);
  await dropUntilOut(page);
  await page.getByRole('link', { name: 'View leaderboard' }).click();
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  await chooseMode(page, 'Invisible Pieces');
  await expect(page.getByRole('list').getByText(name, { exact: true })).toBeVisible();

  await page.goto(room + '/Finn');
  await chooseMode(page, 'Fast Gravity');
  await page.getByRole('button', { name: 'Start round' }).click();
  await expect(page.getByText('Fast Gravity · Solo')).toBeVisible();
  await expect(page.getByText('Score')).toBeVisible();
  await dropUntilOut(page);
  await chooseMode(page, 'Scored Classic');
  await page.getByRole('button', { name: 'Start next round' }).click();
  await expect(page.getByText('Scored Classic · Solo')).toBeVisible();
});

test('keeps a duplicate name on the join form and allows a different name', async ({ browser }, info) => {
  const room = 'Duplicate Room ' + info.repeatEachIndex;
  const host = await browser.newPage();
  const guest = await browser.newPage({ viewport: { width: 320, height: 568 } });
  try {
    const roomPath = '/' + encodeURIComponent(room);
    await host.goto(roomPath + '/Ada');
    await expect(host.getByRole('button', { name: 'Start round' })).toBeVisible();
    await guest.goto('/');
    await guest.getByLabel('Room name').fill(room);
    await guest.getByLabel('Player name').fill('Ada');
    await guest.getByRole('button', { name: /Enter room/ }).click();

    const form = guest.locator('form').filter({ hasText: 'Join a room' });
    await expect(form.getByRole('alert')).toHaveText('That player name is already in use in this room.');
    await expect(guest).toHaveURL(/\/$/);
    await expect(field(guest)).toHaveCount(0);
    await expect(form.getByLabel('Player name')).toHaveValue('Ada');
    await expect(form.getByRole('button', { name: /Enter room/ })).toBeInViewport({ ratio: 1 });

    await guest.goto(roomPath + '/Ada');
    await expect(form.getByRole('alert')).toHaveText('That player name is already in use in this room.');
    await expect(form.getByLabel('Room name')).toHaveValue(room);
    await expect(form.getByLabel('Player name')).toHaveValue('Ada');
    await form.getByLabel('Player name').fill('Ben');
    await form.getByRole('button', { name: /Enter room/ }).click();
    await expect(guest).toHaveURL(new RegExp(encodeURIComponent(room) + '/Ben$'));
    await expect(host.getByRole('img', { name: /Ben column heights/ })).toBeVisible();
  } finally {
    await Promise.all([host.close(), guest.close()]);
  }
});

test('fits the playing field, keeps its focus unobtrusive, and copies via the icon', async ({ page, context }, info) => {
  const room = 'Compact Multiplayer ' + info.repeatEachIndex;
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/' + encodeURIComponent(room) + '/Ada%20Long%20Player%20Name');
  const copy = page.getByRole('button', { name: 'Copy room name' });
  await expect(copy).toHaveText('');
  await expect(copy).toHaveAttribute('title', 'Copy room name');
  await copy.click();
  await expect(page.getByText('Room name copied', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(room);

  const smallViewport = { width: 320, height: 568 };
  await page.setViewportSize(smallViewport);
  const start = page.getByRole('button', { name: 'Start round' });
  await expect(start).toBeInViewport({ ratio: 1 });
  await start.click();
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveCSS('outline-style', 'none');
  for (const viewport of [smallViewport, { width: 768, height: 600 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    await expect(field(page)).toBeInViewport({ ratio: 1 });
    expect(await page.locator('main').evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  }
});
