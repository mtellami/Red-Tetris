import type { Action, Board, FallingPiece } from "./game.js";

export const MODES = {
  classic: { label: "Classic", gravity: 500, scored: false },
  scored: { label: "Scored Classic", gravity: 500, scored: true },
  invisible: { label: "Invisible Pieces", gravity: 500, scored: true },
  fast: { label: "Fast Gravity", gravity: 250, scored: true },
} as const;

export type Mode = keyof typeof MODES;
export type ScoredMode = Exclude<Mode, "classic">;
export type Category = "solo" | "multiplayer";
export type Phase = "lobby" | "running" | "finished";
export const isMode = (value: unknown): value is Mode =>
  typeof value === "string" && Object.hasOwn(MODES, value);
export const isCategory = (value: unknown): value is Category =>
  value === "solo" || value === "multiplayer";
export const validName = (value: unknown): value is string =>
  typeof value === "string" &&
  value === value.trim() &&
  /^[\p{L}\p{N} _-]{1,24}$/u.test(value);
export const validRoom = (value: unknown): value is string =>
  validName(value) && value.toLowerCase() !== "api";

export type RoundResult =
  | { kind: "winner"; playerId: string; name: string }
  | { kind: "draw" }
  | { kind: "solo" };
export interface Snapshot {
  room: string;
  phase: Phase;
  roundId: number;
  mode: Mode;
  category: Category;
  hostId: string;
  selfId: string;
  roster: { id: string; name: string; alive: boolean }[];
  board: Board;
  piece: FallingPiece | null;
  score: number | null;
  opponents: { id: string; name: string; heights: number[]; alive: boolean }[];
  result: RoundResult | null;
  scoreSave: "pending" | "saved" | "failed" | null;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  completedAt: string;
}

export type ErrorCode =
  | "invalid_payload"
  | "already_joined"
  | "name_taken"
  | "round_running"
  | "not_joined"
  | "not_host"
  | "inactive"
  | "stale_round";
export type Reply = { ok: true } | { ok: false; error: ErrorCode };
export type Ack = (reply: Reply) => void;

export interface ClientEvents {
  "room:join": (request: { room: string; name: string }, ack: Ack) => void;
  "round:start": (request: { mode: Mode; roundId: number }, ack: Ack) => void;
  "player:input": (
    request: { action: Action; roundId: number },
    ack?: Ack,
  ) => void;
}

export interface ServerEvents {
  "room:snapshot": (snapshot: Snapshot) => void;
}
