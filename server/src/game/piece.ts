import { spawn } from "#game/game";
import type { FallingPiece, Kind } from "#game/game";

export class Piece {
  constructor(readonly kind: Kind) {}

  spawn(): FallingPiece {
    return spawn(this.kind);
  }
}
