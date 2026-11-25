import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyBoard, spawn } from '#game-core/game';
import type { Cell } from '#game-core/game';
import { Game, Player } from '../src/game.js';
import { MODES } from '#game-core/protocol';

const mutableBoard = () => emptyBoard().map((row) => [...row]);

describe('authoritative round', () => {
  afterEach(() => vi.useRealTimers());

  function setup() {
    vi.useFakeTimers();
    const publish = vi.fn();
    const save = vi.fn(async () => {});
    const game = new Game('arcade', { publish, save, randomIndex: (size) => size - 1 });
    const first = new Player('one', 'One');
    const second = new Player('two', 'Two');
    game.join(first);
    game.join(second);
    return { game, first, second, save };
  }

  it('uses the mode gravity, redacts invisible pieces, and scores a clear', () => {
    const { game, first } = setup();
    game.start('invisible');
    expect(game.snapshot(first).piece).toBeNull();
    const row = mutableBoard();
    row[19].fill('T').fill(null, 3, 7);
    first.board = row;
    game.input(first, 'hardDrop');
    expect(first.score).toBe(100);
    game.dispose();
    game.start('fast');
    vi.advanceTimersByTime(MODES.fast.gravity);
    expect(first.piece?.y).toBe(1);
    game.dispose();
  });

  it('applies penalties to opponents and chooses the survivor after eliminations', () => {
    const { game, first, second } = setup();
    game.start('classic');
    const row = mutableBoard();
    for (const y of [18, 19]) row[y].fill('J').fill(null, 4, 6);
    first.board = row;
    first.piece = spawn('O');
    second.piece = { ...spawn('T'), y: 4 };
    game.input(first, 'hardDrop');
    expect(second.board[19]).toEqual(Array<Cell>(10).fill('penalty'));
    expect(second.piece?.y).toBe(3);
    expect(first.score).toBe(0);
    game.leave(second.id);
    expect(game.result).toEqual({ kind: 'winner', playerId: first.id, name: first.name });
  });

  it('resolves simultaneous spawn failures as a draw and reports a failed save', async () => {
    const { game, first, second, save } = setup();
    save.mockRejectedValueOnce(new Error('disk full'));
    game.start('scored');
    for (const player of [first, second]) {
      const board = mutableBoard();
      board[0][3] = 'Z';
      player.board = board;
      player.piece = { ...spawn('O'), y: 18 };
      player.grounded = true;
    }
    game.tick();
    expect(game.result).toEqual({ kind: 'draw' });
    expect(game.scoreSave).toBe('pending');
    await Promise.resolve();
    expect(game.scoreSave).toBe('failed');
  });

  it('records solo top-out and resets previous round state', async () => {
    const { game, first, second, save } = setup();
    game.leave(second.id);
    game.start('scored');
    const board = mutableBoard();
    board[0][3] = 'J';
    first.board = board;
    first.piece = { ...spawn('O'), y: 18 };
    game.input(first, 'hardDrop');
    expect(game.result).toEqual({ kind: 'solo' });
    expect(save).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(game.scoreSave).toBe('saved');
    game.start('classic');
    expect(game.snapshot(first)).toMatchObject({ roundId: 2, result: null, score: null, scoreSave: null });
    game.leave(first.id);
  });
});
