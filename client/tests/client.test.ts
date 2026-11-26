// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from '@/app';
import { BoardView } from '@/pages/room/board-view';
import { emptyBoard, spawn } from '@game-core/game';
import type { Reply } from '@game-core/protocol';

const { connection, directory } = vi.hoisted(() => {
  function createSocket() {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const socket = {
      handlers,
      connected: true,
      on: vi.fn((name: string, callback: (...args: unknown[]) => unknown) => handlers.set(name, callback)),
      connect: vi.fn(() => handlers.get('connect')?.()),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(() => handlers.clear()),
      emit: vi.fn(),
      timeout: vi.fn(() => socket),
    };
    return socket;
  }
  return { connection: createSocket(), directory: createSocket() };
});
vi.mock('socket.io-client', () => ({
  io: (options: { timeout?: number }) => options.timeout === undefined ? directory : connection,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderRoute = (path: string) => render(h(MemoryRouter, { initialEntries: [path] }, h(App)));

it('renders an intact grid and overlays exactly four falling cells', () => {
  const { container } = render(h(BoardView, { board: emptyBoard(), piece: spawn('L') }));
  expect(container.querySelectorAll('[data-cell]')).toHaveLength(200);
  expect(container.querySelectorAll('[data-cell="L"]')).toHaveLength(4);
});

it('validates the home form and joins with an encoded room name', async () => {
  renderRoute('/');
  fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Bad?' } });
  fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Ada' } });
  fireEvent.click(screen.getByRole('button', { name: /Enter room/ }));
  expect(screen.getByRole('alert').textContent).toContain('1–24');
  fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Friday Game' } });
  connection.emit.mockImplementationOnce((_event, _payload, ack: (error: null, reply: Reply) => void) => {
    ack(null, { ok: true });
  });
  fireEvent.click(screen.getByRole('button', { name: /Enter room/ }));
  expect(await screen.findByRole('heading', { name: 'Friday Game' })).toBeTruthy();
  expect(connection.emit).toHaveBeenCalledWith('room:join', { room: 'Friday Game', name: 'Ada' }, expect.any(Function));
});

it('loads and switches leaderboard filters', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
    String(url).includes('category=multiplayer')
      ? new Response('[]') : new Response(JSON.stringify([{ name: 'Ada', score: 100, completedAt: '2026-02-01' }])),
  );
  try {
    const { container } = renderRoute('/leaderboard');
    expect(await screen.findByRole('rowheader', { name: 'Ada' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Score' })).toBeTruthy();
    expect(container.querySelector('table')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Multiplayer' }));
    expect(await screen.findByText('No scores yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Play a game' }).getAttribute('href')).toBe('/');
    expect(fetch).toHaveBeenCalledWith('/api/leaderboard?mode=scored&category=multiplayer', expect.any(Object));
  } finally {
    fetch.mockRestore();
  }
});
