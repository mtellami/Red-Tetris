import { describe, expect, it } from 'vitest';
import {
  KINDS, addPenalty, collides, coordinates, emptyBoard, gravity, hardDrop,
  lockPiece, move, penaltyFor, pointsFor, spawn, spectrum,
} from './game.js';
import type { Cell } from './game.js';
const mutableBoard = () => emptyBoard().map((row) => [...row]);

describe('pure board rules', () => {
  it.each(KINDS)('spawns and rotates %s through a four-step cycle', (kind) => {
    const board = emptyBoard();
    const piece = spawn(kind);
    expect(new Set(coordinates(piece).map(String)).size).toBe(4);
    expect(collides(board, piece)).toBe(false);
    let next = piece;
    for (let i = 0; i < 4; i++) next = move(board, next, 'rotate');
    expect(next).toEqual(piece);
    if (kind === 'O') expect(coordinates(move(board, piece, 'rotate'))).toEqual(coordinates(piece));
  });

  it('uses the diagram rotation offsets and blocks collisions at walls, floor, and the pile', () => {
    const board = mutableBoard();
    const line = spawn('I');
    expect(coordinates(line)).toEqual([[3, 1], [4, 1], [5, 1], [6, 1]]);
    expect(coordinates(move(board, line, 'rotate'))).toEqual([[5, 0], [5, 1], [5, 2], [5, 3]]);
    expect(move(board, { ...line, x: 0 }, 'left').x).toBe(0);
    expect(move(board, { ...line, x: 6 }, 'right').x).toBe(6);
    board[2][5] = 'T';
    expect(move(board, line, 'rotate')).toBe(line);
    expect(collides(board, { ...line, y: -2 })).toBe(true);
    expect(collides(board, { ...line, y: 19 })).toBe(true);
  });

  it('allows one gravity frame to adjust, and cancels locking if moved off a ledge', () => {
    const board = mutableBoard();
    board[19][4] = 'T';
    const square = { ...spawn('O'), y: 16 };
    const landed = gravity(board, square, false);
    expect(landed).toMatchObject({ grounded: true, lock: false, piece: { y: 17 } });
    const shifted = move(board, landed.piece, 'right');
    expect(gravity(board, shifted, true)).toMatchObject({ piece: { x: 4, y: 18 }, lock: false });
    expect(gravity(board, landed.piece, true).lock).toBe(true);
  });

  it('drops and clears ordinary rows, preserves penalties, and leaves its inputs intact', () => {
    const board = mutableBoard();
    for (const y of [17, 18]) board[y].fill('J').fill(null, 4, 6);
    board[19].fill('penalty');
    const target = hardDrop(board, spawn('O'));
    expect(target.y).toBe(17);
    const output = lockPiece(board, target);
    expect(output.lines).toBe(2);
    expect(board[18][4]).toBeNull();
    expect(output.board[19]).toEqual(Array<Cell>(10).fill('penalty'));
    expect(spectrum(output.board)).toEqual(Array<number>(10).fill(1));
    expect([0, 1, 2, 3, 4].map(penaltyFor)).toEqual([0, 0, 1, 2, 3]);
    expect([0, 1, 2, 3, 4].map(pointsFor)).toEqual([0, 100, 300, 500, 800]);
  });

  it('shifts the stack and falling piece with the penalty and detects overflow', () => {
    const board = mutableBoard();
    board[10][2] = 'S';
    const piece = { ...spawn('I'), y: 5 };
    const raised = addPenalty(board, piece, 2);
    expect(raised.piece?.y).toBe(3);
    expect(raised.overflow).toBe(false);
    expect(raised.board[8][2]).toBe('S');
    expect(spectrum(raised.board)[2]).toBe(12);
    board[0][0] = 'S';
    expect(addPenalty(board, spawn('O'), 1).overflow).toBe(true);
    expect(addPenalty(board, null, 25).overflow).toBe(true);
  });

  it('limits the lift to the highest occupied cell', () => {
    const board = emptyBoard();
    expect(addPenalty(board, spawn('T'), 3)).toMatchObject({
      piece: spawn('T'),
      overflow: false,
    });
    expect(addPenalty(board, spawn('I'), 3)).toMatchObject({
      piece: { ...spawn('I'), y: -1 },
      overflow: false,
    });
  });

  it('tries the original spawn if the lifted piece hits the stack', () => {
    const board = mutableBoard();
    const shifted = { ...spawn('O'), x: 0 };
    board[2][1] = 'S';
    expect(addPenalty(board, shifted, 1)).toMatchObject({
      piece: spawn('O'),
      overflow: false,
    });

    board[2][4] = 'S';
    expect(addPenalty(board, shifted, 1).overflow).toBe(true);
  });
});
