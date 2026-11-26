import { emptyBoard } from "#game/game";
import type { FallingPiece } from "#game/game";

export class Player {
  board = emptyBoard();
  piece: FallingPiece | null = null;
  cursor = 0;
  grounded = false;
  alive = false;
  score = 0;

  constructor(
    readonly id: string,
    readonly name: string,
  ) {}

  reset() {
    this.board = emptyBoard();
    this.piece = null;
    this.cursor = 0;
    this.grounded = false;
    this.alive = true;
    this.score = 0;
  }

  eliminate() {
    this.alive = false;
    this.piece = null;
  }
}
