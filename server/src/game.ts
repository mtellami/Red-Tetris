import { randomInt } from "node:crypto";
import {
  KINDS,
  addPenalty,
  collides,
  emptyBoard,
  gravity,
  hardDrop,
  isGrounded,
  lockPiece,
  move,
  penaltyFor,
  pointsFor,
  spawn,
  spectrum,
} from "#game-core/game";
import type { Action, FallingPiece, Kind } from "#game-core/game";
import { MODES } from "#game-core/protocol";
import type {
  Category,
  LeaderboardEntry,
  Mode,
  Phase,
  RoundResult,
  Snapshot,
} from "#game-core/protocol";

export class Piece {
  constructor(readonly kind: Kind) {}

  spawn(): FallingPiece {
    return spawn(this.kind);
  }
}

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

export interface GameServices {
  publish: (game: Game) => void;
  save: (
    mode: Exclude<Mode, "classic">,
    category: Category,
    scores: LeaderboardEntry[],
  ) => Promise<void>;
  randomIndex?: (limit: number) => number;
}

export class Game {
  readonly players = new Map<string, Player>();
  phase: Phase = "lobby";
  roundId = 0;
  mode: Mode = "classic";
  selectedMode: Mode = "classic";
  category: Category = "solo";
  result: RoundResult | null = null;
  scoreSave: Snapshot["scoreSave"] = null;
  private sequence: Piece[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    readonly room: string,
    private readonly services: GameServices,
  ) {}

  get hostId() {
    return this.players.keys().next().value ?? "";
  }

  join(player: Player) {
    this.players.set(player.id, player);
    this.services.publish(this);
  }

  leave(id: string) {
    this.players.delete(id);
    if (!this.players.size) this.dispose();
    else {
      if (this.phase === "running") this.checkResult();
      this.services.publish(this);
    }
  }

  selectMode(mode: Mode) {
    this.selectedMode = mode;
    this.services.publish(this);
  }

  start(mode: Mode) {
    this.mode = mode;
    this.selectedMode = mode;
    this.roundId += 1;
    this.phase = "running";
    this.category = this.players.size === 1 ? "solo" : "multiplayer";
    this.result = null;
    this.scoreSave = null;
    this.sequence = [];
    for (const player of this.players.values()) {
      player.reset();
      this.spawnNext(player);
    }
    this.timer = setInterval(() => this.tick(), MODES[mode].gravity);
    this.services.publish(this);
  }

  input(player: Player, action: Action) {
    const piece = player.piece;
    if (!piece) return;
    if (action === "hardDrop") {
      player.piece = hardDrop(player.board, piece);
      this.resolveLocks([player]);
    } else {
      player.piece = move(player.board, piece, action);
      player.grounded = isGrounded(player.board, player.piece);
    }
    this.services.publish(this);
  }

  tick() {
    const locks: Player[] = [];
    for (const player of this.players.values()) {
      if (!player.piece) continue;
      const next = gravity(player.board, player.piece, player.grounded);
      player.piece = next.piece;
      player.grounded = next.grounded;
      if (next.lock) locks.push(player);
    }
    this.resolveLocks(locks);
    this.services.publish(this);
  }

  dispose() {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  snapshot(player: Player): Snapshot {
    return {
      room: this.room,
      phase: this.phase,
      roundId: this.roundId,
      mode: this.mode,
      selectedMode: this.selectedMode,
      category: this.category,
      hostId: this.hostId,
      selfId: player.id,
      result: this.result,
      board: player.board,
      piece: this.mode === "invisible" ? null : player.piece,
      score: MODES[this.mode].scored ? player.score : null,
      scoreSave: this.scoreSave,
      roster: [...this.players.values()].map(({ id, name, alive }) => ({
        id,
        name,
        alive,
      })),
      opponents: [...this.players.values()]
        .filter((opponent) => opponent !== player)
        .map(({ id, name, alive, board }) => ({
          id,
          name,
          alive,
          heights: spectrum(board),
        })),
    };
  }

  private spawnNext(player: Player) {
    if (player.cursor === this.sequence.length) {
      const bag = [...KINDS];
      const choose = this.services.randomIndex ?? randomInt;
      for (let last = bag.length - 1; last > 0; last--) {
        const index = choose(last + 1);
        [bag[last], bag[index]] = [bag[index], bag[last]];
      }
      this.sequence.push(...bag.map((kind) => new Piece(kind)));
    }
    const piece = this.sequence[player.cursor++].spawn();
    if (collides(player.board, piece)) player.eliminate();
    else {
      player.piece = piece;
      player.grounded = isGrounded(player.board, piece);
    }
  }

  private resolveLocks(locks: Player[]) {
    const attacks = new Map<Player, number>();
    for (const player of locks) {
      if (!player.piece) continue;
      const { board, lines } = lockPiece(player.board, player.piece);
      player.board = board;
      player.piece = null;
      if (MODES[this.mode].scored) player.score += pointsFor(lines);
      attacks.set(player, penaltyFor(lines));
    }

    const total = [...attacks.values()].reduce(
      (sum, amount) => sum + amount,
      0,
    );
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const amount = total - (attacks.get(player) ?? 0);
      if (!amount) continue;
      const penalty = addPenalty(player.board, player.piece, amount);
      player.board = penalty.board;
      if (penalty.overflow) player.eliminate();
      else {
        player.piece = penalty.piece;
        if (penalty.piece)
          player.grounded = isGrounded(player.board, penalty.piece);
      }
    }

    for (const player of locks) {
      if (player.alive) this.spawnNext(player);
    }
    this.checkResult();
  }

  private checkResult() {
    const alive = [...this.players.values()].filter((player) => player.alive);
    if (
      this.phase !== "running" ||
      alive.length > (this.category === "solo" ? 0 : 1)
    )
      return;

    const [winner] = alive;
    this.result =
      this.category === "solo"
        ? { kind: "solo" }
        : winner
          ? { kind: "winner", playerId: winner.id, name: winner.name }
          : { kind: "draw" };
    this.phase = "finished";
    this.dispose();

    if (this.mode === "classic") return;
    const completedAt = new Date().toISOString();
    const scores = [...this.players.values()].map(({ name, score }) => ({
      name,
      score,
      completedAt,
    }));
    const roundId = this.roundId;
    this.scoreSave = "pending";
    void this.services.save(this.mode, this.category, scores).then(
      () => this.reportScoreSave(roundId, "saved"),
      () => this.reportScoreSave(roundId, "failed"),
    );
  }

  private reportScoreSave(roundId: number, status: "saved" | "failed") {
    if (this.roundId !== roundId || !this.players.size) return;
    this.scoreSave = status;
    this.services.publish(this);
  }
}
