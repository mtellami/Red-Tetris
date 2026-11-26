import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { attachRooms } from '../src/sockets.js';
import type { ClientEvents, Mode, OpenRoom, ServerEvents, Snapshot } from '#game/protocol';

const httpClients: Socket<ServerEvents, ClientEvents>[] = [];
let server: Server<ClientEvents, ServerEvents>;
let rooms: ReturnType<typeof attachRooms>;
let url: string;

beforeEach(async () => {
  const http = createServer();
  server = new Server<ClientEvents, ServerEvents>(http);
  rooms = attachRooms(server, { save: async () => {}, randomIndex: (size) => size - 1 });
  await new Promise<void>((resolve, reject) => http.once('error', reject).listen(0, '127.0.0.1', resolve));
  const address = http.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  url = 'http://127.0.0.1:' + address.port;
});

afterEach(async () => {
  for (const socket of httpClients.splice(0)) socket.disconnect();
  await server.close();
});

async function client() {
  const socket: Socket<ServerEvents, ClientEvents> = connect(url, {
    forceNew: true, transports: ['websocket'], autoConnect: false,
  });
  httpClients.push(socket);
  const connection = new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  let latest: Snapshot | undefined;
  socket.on('room:snapshot', (snapshot) => { latest = snapshot; });
  socket.connect();
  await connection;
  return {
    socket,
    get snapshot() { return latest; },
    join: (room: string, name: string, lobbyOnly?: boolean) =>
      socket.timeout(1500).emitWithAck('room:join', { room, name, lobbyOnly }),
    selectMode: (mode: Mode, roundId: number) => socket.timeout(1500).emitWithAck('round:select-mode', { mode, roundId }),
    start: (roundId: number, mode?: Mode) => socket.timeout(1500).emitWithAck('round:start', { roundId, mode }),
    drop: (roundId: number) => socket.timeout(1500).emitWithAck('player:input', { action: 'hardDrop', roundId }),
  };
}

it('isolates rooms, synchronizes pieces across different play speeds, and transfers host on disconnect', async () => {
  const [one, two, other, late] = await Promise.all([client(), client(), client(), client()]);
  expect(await one.join('arcade', 'Ada')).toEqual({ ok: true });
  expect(await two.join('arcade', 'Ben')).toEqual({ ok: true });
  expect(await other.join('elsewhere', 'Cleo')).toEqual({ ok: true });
  expect(await late.join('arcade', 'Ben')).toEqual({ ok: false, error: 'name_taken' });
  expect(await two.start(0)).toEqual({ ok: false, error: 'not_host' });
  expect(await one.start(0, 'classic')).toEqual({ ok: true });
  await expect.poll(() => two.snapshot?.piece).toEqual(one.snapshot?.piece);
  expect(other.snapshot?.phase).toBe('lobby');
  expect(await late.join('arcade', 'Dee')).toEqual({ ok: false, error: 'round_running' });
  expect(await one.start(1)).toEqual({ ok: false, error: 'round_running' });

  await one.drop(1);
  const next = one.snapshot?.piece;
  expect(next?.kind).toBe('J');
  expect(two.snapshot?.piece?.kind).toBe('I');
  await expect.poll(() => two.snapshot?.opponents[0].heights.some((height) => height > 0)).toBe(true);
  await two.drop(1);
  expect(two.snapshot?.piece).toEqual(next);

  const finished = new Promise<Snapshot>((resolve) => two.socket.once('room:snapshot', resolve));
  one.socket.disconnect();
  expect(await finished).toMatchObject({ hostId: two.socket.id, result: { kind: 'winner', name: 'Ben' } });
  expect(await two.drop(1)).toEqual({ ok: false, error: 'inactive' });
  expect(await late.join('arcade', 'Dee')).toEqual({ ok: true });
  expect(await two.start(1)).toEqual({ ok: true });
  expect(await two.drop(1)).toEqual({ ok: false, error: 'stale_round' });
  expect(two.snapshot?.board.flat().every((cell) => cell === null)).toBe(true);
  late.socket.disconnect();
  two.socket.disconnect();
  await expect.poll(() => rooms.has('arcade')).toBe(false);
});

it('lists waiting rooms and rejects stale directory joins', async () => {
  const [host, other, guest, watcher] = await Promise.all([client(), client(), client(), client()]);
  await host.join('Zeta Arcade', 'Ada');
  let open: OpenRoom[] | undefined;
  watcher.socket.on('rooms:open', (rooms) => { open = rooms; });
  watcher.socket.emit('rooms:watch');
  await expect.poll(() => open).toEqual([{ room: 'Zeta Arcade', playerCount: 1, mode: 'classic' }]);

  await other.join('Alpha Arcade', 'Cleo');
  await guest.join('Zeta Arcade', 'Ben', true);
  await expect.poll(() => open).toEqual([
    { room: 'Alpha Arcade', playerCount: 1, mode: 'classic' },
    { room: 'Zeta Arcade', playerCount: 2, mode: 'classic' },
  ]);

  expect(await guest.selectMode('fast', 0)).toEqual({ ok: false, error: 'not_host' });
  expect(await host.selectMode('fast', 1)).toEqual({ ok: false, error: 'stale_round' });
  expect(await host.selectMode('fast', 0)).toEqual({ ok: true });
  await expect.poll(() => guest.snapshot).toMatchObject({ phase: 'lobby', selectedMode: 'fast' });
  await expect.poll(() => open).toEqual([
    { room: 'Alpha Arcade', playerCount: 1, mode: 'classic' },
    { room: 'Zeta Arcade', playerCount: 2, mode: 'fast' },
  ]);
  await host.start(0);
  await expect.poll(() => guest.snapshot).toMatchObject({ phase: 'running', mode: 'fast' });
  expect(await host.selectMode('scored', 1)).toEqual({ ok: false, error: 'round_running' });
  await expect.poll(() => open).toEqual([{ room: 'Alpha Arcade', playerCount: 1, mode: 'classic' }]);
  expect(await watcher.join('Zeta Arcade', 'Dee', true)).toEqual({ ok: false, error: 'round_running' });
  other.socket.disconnect();
  await expect.poll(() => open).toEqual([]);
  expect(await watcher.join('Alpha Arcade', 'Dee', true)).toEqual({ ok: false, error: 'room_unavailable' });
  expect(rooms.has('Alpha Arcade')).toBe(false);

  host.socket.disconnect();
  await expect.poll(() => guest.snapshot?.phase).toBe('finished');
  expect(await guest.selectMode('invisible', 1)).toEqual({ ok: true });
  expect(guest.snapshot).toMatchObject({ phase: 'finished', mode: 'fast', selectedMode: 'invisible' });
  expect(open).toEqual([]);
  expect(await watcher.join('Zeta Arcade', 'Dee', true)).toEqual({ ok: false, error: 'room_unavailable' });
  expect(await watcher.join('Zeta Arcade', 'Dee')).toEqual({ ok: true });
});

it('rejects bad payloads and runs a one-player Classic round to top-out', async () => {
  const solo = await client();
  expect(await solo.join('!', 'Ada')).toEqual({ ok: false, error: 'invalid_payload' });
  expect(await solo.join('API', 'Ada')).toEqual({ ok: false, error: 'invalid_payload' });
  expect(await solo.start(0)).toEqual({ ok: false, error: 'not_joined' });
  expect(await solo.drop(0)).toEqual({ ok: false, error: 'not_joined' });
  await solo.join('solo', 'Ada');
  expect(await solo.join('newroom', 'Ada')).toEqual({ ok: false, error: 'already_joined' });
  expect(await solo.start(1)).toEqual({ ok: false, error: 'stale_round' });
  await solo.start(0);
  for (let i = 0; i < 20 && solo.snapshot?.phase === 'running'; i++) await solo.drop(1);
  expect(solo.snapshot).toMatchObject({ category: 'solo', result: { kind: 'solo' }, score: null });
});
