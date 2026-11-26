import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Leaderboard } from '../src/leaderboard.js';
import { createApp } from '../src/http.js';

let directory: string;
let server: Server | undefined;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'red-tetris-tests-'));
});

afterEach(async () => {
  if (server) {
    const closing = new Promise<void>((resolve) => server?.close(() => resolve()));
    server.closeAllConnections();
    await closing;
    server = undefined;
  }
  vi.restoreAllMocks();
  await rm(directory, { recursive: true });
});

it('serializes concurrent writes, keeps the top ten, and loads the saved ranks through a new instance', async () => {
  const file = join(directory, 'scores.json');
  const leaderboard = new Leaderboard(file);
  const completedAt = '2026-02-01T00:00:00.000Z';
  const first = { name: 'Ada', score: 200, completedAt };
  const second = { name: 'Ben', score: 200, completedAt: '2026-03-01T00:00:00.000Z' };

  expect(await leaderboard.list('scored', 'solo')).toEqual([]);
  await Promise.all([
    leaderboard.save('scored', 'solo', [second]),
    leaderboard.save('scored', 'solo', [
      first,
      ...Array.from({ length: 15 }, (_, score) => ({ name: 'Cleo', score, completedAt })),
    ]),
    leaderboard.save('fast', 'multiplayer', [second]),
  ]);

  const reloaded = new Leaderboard(file);
  const solo = await reloaded.list('scored', 'solo');
  expect(solo).toHaveLength(10);
  expect(solo.slice(0, 2)).toEqual([first, second]);
  expect(solo[9].score).toBe(7);
  expect(await reloaded.list('fast', 'multiplayer')).toEqual([second]);
  expect(await reloaded.list('fast', 'solo')).toEqual([]);
});

it('omits zero-point scores already on disk and skips new zero-point scores', async () => {
  const file = join(directory, 'scores.json');
  const leaderboard = new Leaderboard(file);
  const completedAt = '2026-02-01T00:00:00.000Z';
  const legacy = { name: 'Ada', score: 0, completedAt };
  const zero = { name: 'Ben', score: 0, completedAt };
  const positive = { name: 'Cleo', score: 100, completedAt };
  const seeded = JSON.stringify({ 'scored:solo': [legacy] });
  await writeFile(file, seeded);

  expect(await leaderboard.list('scored', 'solo')).toEqual([]);
  await leaderboard.save('scored', 'solo', [zero]);
  expect(await readFile(file, 'utf8')).toBe(seeded);

  await leaderboard.save('scored', 'solo', [zero, positive]);
  expect(await leaderboard.list('scored', 'solo')).toEqual([positive]);
  expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ 'scored:solo': [positive] });
});

it('serves the deep-linked SPA, assets and leaderboard API with meaningful errors', async () => {
  const file = join(directory, 'scores.json');
  const site = join(directory, 'client');
  await mkdir(site);
  await writeFile(join(site, 'index.html'), '<script src="/bundle.js"></script>');
  await writeFile(join(site, 'bundle.js'), 'export {};');
  const leaderboard = new Leaderboard(file);
  server = createServer(createApp(leaderboard, site));
  await new Promise<void>((resolve, reject) => server?.once('error', reject).listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  const get = (path: string, init?: RequestInit) => fetch('http://127.0.0.1:' + address.port + path, init);

  expect(await (await get('/Friday%20Game/Ada')).text()).toContain('/bundle.js');
  expect((await get('/assets/Ada')).status).toBe(200);
  expect((await get('/leaderboard')).status).toBe(200);
  expect((await get('/rooms')).status).toBe(200);
  expect((await get('/rooms/')).status).toBe(200);
  expect((await get('/rooms/Ada')).status).toBe(200);
  expect((await get('/bundle.js', { method: 'HEAD' })).headers.get('content-type')).toContain('javascript');
  expect((await get('/assets/missing.css')).status).toBe(404);
  expect((await get('/missing.js')).status).toBe(404);
  expect((await get('/api/missing')).status).toBe(404);
  expect((await get('/', { method: 'POST' })).status).toBe(405);
  expect((await get('/api/leaderboard?category=invalid')).status).toBe(400);
  const score = { name: 'Ada', score: 100, completedAt: '2026-02-01T00:00:00.000Z' };
  await leaderboard.save('scored', 'solo', [score]);
  expect(await (await get('/api/leaderboard')).json()).toEqual([score]);

  await writeFile(file, 'invalid JSON');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(leaderboard.save('scored', 'solo', [score])).rejects.toThrow();
  expect((await get('/api/leaderboard')).status).toBe(503);
  await writeFile(file, '{}');
  await leaderboard.save('scored', 'solo', [score]);
  expect(await (await get('/api/leaderboard')).json()).toEqual([score]);
});
