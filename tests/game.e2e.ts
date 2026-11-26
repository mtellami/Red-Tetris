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
  await page.getByRole('region', { name: 'Game mode' }).getByRole('button', { name: 'Start round' }).click();
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

test('plays the bonus modes and leaves the leaderboard empty after a zero-point round', async ({ page }, info) => {
  const room = '/Bonus' + info.repeatEachIndex;
  const name = 'Dana' + info.repeatEachIndex;
  await page.goto(room + '/' + name);
  await chooseMode(page, 'Invisible Pieces');
  await page.getByRole('button', { name: 'Start round' }).click();
  await expect(page.getByText('Invisible Pieces · Solo')).toBeVisible();
  await expect(occupiedCells(page)).toHaveCount(0);
  await dropUntilOut(page);
  await page.getByRole('button', { name: 'View leaderboard' }).click();
  await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
  await page.getByText('Invisible Pieces', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No scores yet.' })).toBeVisible();

  await page.goto(room + '/Finn');
  await chooseMode(page, 'Fast Gravity');
  await page.getByRole('button', { name: 'Start round' }).click();
  await expect(page.getByText('Fast Gravity · Solo')).toBeVisible();
  await expect(page.getByText('Score').filter({ visible: true })).toBeVisible();
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

test('shares a room link that prefills a guest’s join form', async ({ page, context }, info) => {
  const room = 'Équipe Arcade ' + info.repeatEachIndex;
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/' + encodeURIComponent(room) + '/Ada');
  await expect(page.getByRole('button', { name: 'Start round' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Invite someone' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'Room controls', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Room controls' });
  const inviteCard = drawer.getByRole('region', { name: 'Invite someone' });
  const copyLink = inviteCard.getByRole('button', { name: 'Copy invite link' });
  await expect(page.getByRole('button', { name: 'Copy invite link' })).toHaveCount(1);
  await expect(copyLink).toHaveText('');
  const iconStroke = copyLink.locator('span[aria-hidden="true"] > span').last();
  await expect(iconStroke).toHaveCSS('border-top-width', '2px');
  await expect(iconStroke).toHaveCSS('border-top-color', await copyLink.evaluate((button) => getComputedStyle(button).color));
  await copyLink.click();
  await expect(page.getByText('Invite link copied', { exact: true })).toBeVisible();
  const invite = await page.evaluate(() => navigator.clipboard.readText());
  await expect(inviteCard.getByRole('textbox', { name: 'Invite link' })).toHaveValue(invite);
  expect(new URL(invite).searchParams.get('room')).toBe(room);
  await drawer.getByRole('button', { name: 'Close room controls' }).click();
  await expect(drawer).toHaveCount(0);

  const guest = await context.newPage();
  try {
    await guest.setViewportSize({ width: 320, height: 568 });
    await guest.goto(invite);
    await expect(guest.getByLabel('Room name')).toHaveValue(room);
    await expect(guest.getByLabel('Player name')).toHaveValue('');
    await guest.getByLabel('Player name').fill('Ben');
    await guest.getByRole('button', { name: /Enter room/ }).click();
    await expect(page.getByRole('img', { name: /Ben column heights/ })).toBeVisible();
    await guest.getByRole('button', { name: 'Go back', exact: true }).click();
    await expect(guest).toHaveURL(invite);
  } finally {
    await guest.close();
  }
});

test('filters waiting rooms by live mode and joins from a narrow screen', async ({ page, context }, info) => {
  const room = 'Open Arcade ' + info.repeatEachIndex;
  const host = await context.newPage();
  try {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Open rooms' })).toHaveCount(0);
    await page.getByLabel('Player name').fill('Ben');
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Rooms' }).click();
    await expect(page).toHaveURL(/\/rooms$/);
    await expect(page.getByLabel('Room name')).toHaveCount(0);
    const directory = page.getByRole('region', { name: 'Open rooms' });
    await expect(directory.getByText('No open rooms right now.')).toBeVisible();
    await host.goto('/' + encodeURIComponent(room) + '/Ada');
    const join = directory.getByRole('link', { name: 'Join ' + room });
    const fastFilter = directory.getByRole('button', { name: 'Fast Gravity', exact: true });
    await expect(directory.getByText('1 player · Classic')).toBeVisible();
    await expect(directory.getByRole('button', { pressed: true })).toHaveCount(0);
    await fastFilter.click();
    await expect(fastFilter).toHaveAttribute('aria-pressed', 'true');
    await expect(directory.getByText('No open rooms for Fast Gravity.')).toBeVisible();
    await fastFilter.click();
    await expect(directory.getByRole('button', { pressed: true })).toHaveCount(0);
    await expect(directory.getByText('1 player · Classic')).toBeVisible();
    await fastFilter.click();
    await chooseMode(host, 'Fast Gravity');
    await expect(directory.getByText('1 player · Fast Gravity')).toBeVisible();
    await join.click();
    await expect(page.getByLabel('Room name')).toHaveValue(room);
    await expect(page.getByLabel('Player name')).toHaveValue('Ben');
    await expect(page.getByLabel('Player name')).toBeFocused();
    await page.getByRole('button', { name: /Enter room/ }).click();
    await expect(page).toHaveURL(new RegExp('/' + encodeURIComponent(room) + '/Ben$'));
    await expect(page.getByText('Fast Gravity', { exact: true })).toBeVisible();
    await expect(host.getByRole('img', { name: /Ben column heights/ })).toBeVisible();
    await chooseMode(host, 'Invisible Pieces');
    await expect(page.getByText('Invisible Pieces', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /\bMode\b/ })).toHaveCount(0);
  } finally {
    await host.close();
  }
});

test('keeps the join form intact when a selected room starts or closes', async ({ page, context }, info) => {
  const firstRoom = 'Starting Arcade ' + info.repeatEachIndex;
  const secondRoom = 'Closing Arcade ' + info.repeatEachIndex;
  const host = await context.newPage();
  const other = await context.newPage();
  const directory = await context.newPage();
  try {
    await host.goto('/' + encodeURIComponent(firstRoom) + '/Ada');
    await other.goto('/' + encodeURIComponent(secondRoom) + '/Cleo');
    await page.goto('/rooms');
    await directory.goto('/rooms');
    const selectStarting = page.getByRole('link', { name: 'Join ' + firstRoom });
    const selectClosing = page.getByRole('link', { name: 'Join ' + secondRoom });
    await selectStarting.click();
    await page.getByLabel('Player name').fill('Ben');
    await host.getByRole('button', { name: 'Start round' }).click();
    await expect(host.getByText('Classic · Solo')).toBeVisible();
    await page.getByRole('button', { name: /Enter room/ }).click();
    await expect(page.getByRole('alert')).toContainText('A round is in progress');

    await page.getByRole('link', { name: 'Rooms', exact: true }).click();
    await selectClosing.click();
    const observedRoom = directory.getByRole('link', { name: 'Join ' + secondRoom });
    await expect(observedRoom).toBeVisible();
    await other.close();
    await expect(observedRoom).toHaveCount(0);
    await page.getByRole('button', { name: /Enter room/ }).click();
    await expect(page.getByRole('alert')).toContainText('This room is no longer open');
    await expect(page.getByLabel('Player name')).toHaveValue('Ben');
    await page.getByLabel('Room name').fill('New Arcade');
    await page.getByRole('button', { name: /Enter room/ }).click();
    await expect(page).toHaveURL(/\/New%20Arcade\/Ben$/);
  } finally {
    await Promise.all([host.close(), other.close(), directory.close()]);
  }
});

test('fits the playing field and keeps its focus unobtrusive', async ({ page }, info) => {
  const room = 'Compact Multiplayer ' + info.repeatEachIndex;
  await page.goto('/' + encodeURIComponent(room) + '/Ada%20Long%20Player%20Name');

  const smallViewport = { width: 320, height: 568 };
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

test('opens host controls and plays the round with touch buttons', async ({ browser }, info) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 320, height: 568 } });
  const host = await context.newPage();
  const room = '/Touch Arcade ' + info.repeatEachIndex;
  try {
    const sentActions: string[] = [];
    host.on('websocket', (socket) => {
      socket.on('framesent', ({ payload }) => {
        if (typeof payload !== 'string' || !payload.startsWith('42["player:input"')) return;
        const [, input] = JSON.parse(payload.slice(2));
        sentActions.push(input.action);
      });
    });
    await host.goto(room + '/Ada');
    await expect(host.getByRole('link', { name: '← Rooms' })).toBeHidden();
    const back = host.getByRole('button', { name: 'Go back', exact: true });
    await expect(back).toBeVisible();
    const startShortcut = host.getByRole('button', { name: 'Start round', exact: true });
    await expect(startShortcut).toBeEnabled();
    await expect(host.getByText('Classic', { exact: true }).filter({ visible: true })).toBeVisible();
    const controls = host.getByRole('group', { name: 'Game controls' });
    await expect(controls.getByRole('button', { name: 'Hard drop' })).toBeDisabled();

    const guests = await Promise.all(['Ben', 'Cleo', 'Dee', 'Eve'].map(async (name) => {
      const guest = await context.newPage();
      await guest.goto(room + '/' + name);
      return guest;
    }));
    const opponents = host.getByRole('group', { name: 'Opponent boards' });
    await expect(opponents.getByRole('img')).toHaveCount(4);
    expect(await opponents.evaluate((strip) => strip.scrollWidth > strip.clientWidth)).toBe(true);
    const opponentBox = await opponents.boundingBox();
    const boardBox = await field(host).boundingBox();
    expect(opponentBox!.y + opponentBox!.height).toBeLessThanOrEqual(boardBox!.y);
    await expect(guests[0].getByRole('button', { name: 'Room controls', exact: true })).toHaveCount(0);
    await expect(guests[0].getByRole('button', { name: 'Start round', exact: true })).toHaveCount(0);

    await host.getByRole('button', { name: 'Room controls', exact: true }).tap();
    const drawer = host.getByRole('dialog', { name: 'Room controls' });
    const modeCard = drawer.getByRole('region', { name: 'Game mode' });
    const players = drawer.getByRole('heading', { name: 'Players' });
    await expect(players).toBeVisible();
    await expect(modeCard.getByRole('button', { name: 'Start round' })).toBeVisible();
    expect((await modeCard.boundingBox())!.y).toBeLessThan((await players.boundingBox())!.y);
    await expect(drawer.getByRole('region', { name: 'Invite someone' })).toBeVisible();
    await chooseMode(host, 'Scored Classic');
    await drawer.getByRole('button', { name: 'Close room controls' }).tap();
    await expect(drawer).toHaveCount(0);
    await startShortcut.tap();
    await expect(startShortcut).toBeDisabled();
    await expect(guests[0].getByText('Scored Classic', { exact: true })).toBeVisible();
    await expect(controls).toBeInViewport({ ratio: 1 });
    await expect(field(host)).toBeInViewport({ ratio: 1 });
    for (const label of ['Move left', 'Soft drop', 'Rotate', 'Hard drop', 'Move right']) {
      await controls.getByRole('button', { name: label, exact: true }).tap();
    }
    await expect.poll(() => sentActions).toEqual(['left', 'softDrop', 'rotate', 'hardDrop', 'right']);
    await expect(field(host).locator('[data-cell]:not([data-cell="empty"]):not([data-falling])')).toHaveCount(4);
    await back.tap();
    await expect(host).toHaveURL(/\/rooms$/);
  } finally {
    await context.close();
  }
});
