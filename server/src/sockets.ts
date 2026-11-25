import type { Server } from "socket.io";
import { ACTIONS } from "#game-core/game";
import { isMode, validName, validRoom } from "#game-core/protocol";
import type { Ack, ClientEvents, ServerEvents } from "#game-core/protocol";
import { Game, Player } from "./game.js";
import type { GameServices } from "./game.js";

type GameSocketServer = Server<ClientEvents, ServerEvents>;
const reply: Ack = () => {};
const getAck = (ack: unknown): Ack =>
  typeof ack === "function" ? (ack as Ack) : reply;

export function attachRooms(
  io: GameSocketServer,
  services: Pick<GameServices, "save" | "randomIndex">,
) {
  const rooms = new Map<string, Game>();
  const publish = (game: Game) => {
    for (const player of game.players.values()) {
      io.to(player.id).emit("room:snapshot", game.snapshot(player));
    }
  };

  io.on("connection", (socket) => {
    let game: Game | undefined;
    let player: Player | undefined;

    socket.on("room:join", (request, ack) => {
      const respond = getAck(ack);
      if (!validRoom(request?.room) || !validName(request?.name)) {
        return respond({ ok: false, error: "invalid_payload" });
      }
      if (game) return respond({ ok: false, error: "already_joined" });
      const existing = rooms.get(request.room);
      if (
        [...(existing?.players.values() ?? [])].some(
          ({ name }) => name === request.name,
        )
      ) {
        return respond({ ok: false, error: "name_taken" });
      }
      if (existing?.phase === "running")
        return respond({ ok: false, error: "round_running" });

      game = existing ?? new Game(request.room, { ...services, publish });
      rooms.set(request.room, game);
      player = new Player(socket.id, request.name);
      game.join(player);
      respond({ ok: true });
    });

    socket.on("round:start", (request, ack) => {
      const respond = getAck(ack);
      if (!isMode(request?.mode) || !Number.isSafeInteger(request?.roundId)) {
        return respond({ ok: false, error: "invalid_payload" });
      }
      if (!game) return respond({ ok: false, error: "not_joined" });
      if (game.hostId !== socket.id)
        return respond({ ok: false, error: "not_host" });
      if (game.roundId !== request.roundId)
        return respond({ ok: false, error: "stale_round" });
      if (game.phase === "running")
        return respond({ ok: false, error: "round_running" });

      game.start(request.mode);
      respond({ ok: true });
    });

    socket.on("player:input", (request, ack) => {
      const respond = getAck(ack);
      if (
        !ACTIONS.includes(request?.action) ||
        !Number.isSafeInteger(request?.roundId)
      ) {
        return respond({ ok: false, error: "invalid_payload" });
      }
      if (!game || !player) return respond({ ok: false, error: "not_joined" });
      if (request.roundId !== game.roundId)
        return respond({ ok: false, error: "stale_round" });
      if (game.phase !== "running" || !player.alive)
        return respond({ ok: false, error: "inactive" });

      game.input(player, request.action);
      respond({ ok: true });
    });

    socket.on("disconnect", () => {
      if (!game) return;
      game.leave(socket.id);
      if (!game.players.size) rooms.delete(game.room);
    });
  });

  return rooms;
}
