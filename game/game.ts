export const WIDTH = 10;
export const HEIGHT = 20;
export const KINDS = ["I", "J", "L", "O", "S", "T", "Z"] as const;
export type Kind = (typeof KINDS)[number];
export type Cell = Kind | "penalty" | null;
export type Board = readonly (readonly Cell[])[];
export type Point = readonly [number, number];
export type Action = "left" | "right" | "rotate" | "softDrop" | "hardDrop";
export const ACTIONS: readonly Action[] = [
  "left",
  "right",
  "rotate",
  "softDrop",
  "hardDrop",
];

export interface FallingPiece {
  kind: Kind;
  rotation: number;
  x: number;
  y: number;
}

const shapes: Record<Kind, { size: number; cells: readonly Point[] }> = {
  I: {
    size: 4,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  J: {
    size: 3,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    size: 3,
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  O: {
    size: 4,
    cells: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  },
  S: {
    size: 3,
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  T: {
    size: 3,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  Z: {
    size: 3,
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
};

const row = (cell: Cell = null) => Array<Cell>(WIDTH).fill(cell);
export const emptyBoard = (): Board =>
  Array.from({ length: HEIGHT }, () => row());

export function spawn(kind: Kind): FallingPiece {
  return {
    kind,
    rotation: 0,
    x: Math.floor((WIDTH - shapes[kind].size) / 2),
    y: 0,
  };
}

export function coordinates(piece: FallingPiece): Point[] {
  const { size, cells } = shapes[piece.kind];
  return cells.map(([startX, startY]) => {
    let x = startX;
    let y = startY;
    for (let turn = 0; piece.kind !== "O" && turn < piece.rotation; turn++) {
      [x, y] = [size - 1 - y, x];
    }
    return [x + piece.x, y + piece.y];
  });
}

export function collides(board: Board, piece: FallingPiece): boolean {
  return coordinates(piece).some(
    ([x, y]) =>
      x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || board[y][x] !== null,
  );
}

const below = (piece: FallingPiece): FallingPiece => ({
  ...piece,
  y: piece.y + 1,
});
export const isGrounded = (board: Board, piece: FallingPiece) =>
  collides(board, below(piece));

export function move(
  board: Board,
  piece: FallingPiece,
  action: Exclude<Action, "hardDrop">,
): FallingPiece {
  let next: FallingPiece;
  switch (action) {
    case "left":
      next = { ...piece, x: piece.x - 1 };
      break;
    case "right":
      next = { ...piece, x: piece.x + 1 };
      break;
    case "rotate":
      next = { ...piece, rotation: (piece.rotation + 1) % 4 };
      break;
    case "softDrop":
      next = below(piece);
      break;
  }
  return collides(board, next) ? piece : next;
}

export function gravity(board: Board, piece: FallingPiece, grounded: boolean) {
  if (grounded && isGrounded(board, piece))
    return { piece, grounded: true, lock: true };
  const next = move(board, piece, "softDrop");
  return { piece: next, grounded: isGrounded(board, next), lock: false };
}

export function hardDrop(board: Board, piece: FallingPiece): FallingPiece {
  let next = piece;
  while (!isGrounded(board, next)) next = below(next);
  return next;
}

export function lockPiece(board: Board, piece: FallingPiece) {
  const settled = board.map((cells) => [...cells]);
  for (const [x, y] of coordinates(piece)) settled[y][x] = piece.kind;
  const remaining = settled.filter((cells) =>
    cells.some((cell) => cell === null || cell === "penalty"),
  );
  const lines = HEIGHT - remaining.length;
  return {
    board: [...Array.from({ length: lines }, () => row()), ...remaining],
    lines,
  };
}

export function addPenalty(
  board: Board,
  piece: FallingPiece | null,
  count: number,
) {
  const amount = Math.min(count, HEIGHT);
  const overflow = board
    .slice(0, amount)
    .some((cells) => cells.some((cell) => cell !== null));
  const next = piece && { ...piece, y: piece.y - amount };
  const nextBoard = [
    ...board.slice(amount),
    ...Array.from({ length: amount }, () => row("penalty")),
  ];
  return {
    board: nextBoard,
    piece: next,
    overflow: overflow || (next !== null && collides(nextBoard, next)),
  };
}

export function spectrum(board: Board): number[] {
  return Array.from({ length: WIDTH }, (_, x) => {
    const first = board.findIndex((cells) => cells[x] !== null);
    return first < 0 ? 0 : HEIGHT - first;
  });
}

export const penaltyFor = (lines: number) => Math.max(0, lines - 1);
export const pointsFor = (lines: number) => [0, 100, 300, 500, 800][lines];
