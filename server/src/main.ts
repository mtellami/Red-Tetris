import { join, resolve } from "node:path";
import { Server } from "socket.io";
import type { ClientEvents, ServerEvents } from "#game/protocol";
import { createApp } from "./app.js";
import { attachRooms } from "./socket.js";
import { Leaderboard } from "./storage/leaderboard.js";

const apiOnly = process.argv.includes("--api-only");
const project = resolve(
  import.meta.dirname,
  import.meta.filename.endsWith(".ts") ? "../.." : "../../..",
);
const clientDir = apiOnly ? undefined : join(project, "client", "dist");
const defaultScores = join(project, "data", "leaderboard.json");
const leaderboard = new Leaderboard(
  resolve(process.env.LEADERBOARD_FILE ?? defaultScores),
);
const port = Number(process.env.PORT ?? 3000);
const app = createApp(leaderboard, clientDir);
const http = app.listen(port);
const io = new Server<ClientEvents, ServerEvents>(http);
attachRooms(io, {
  save: async (mode, category, scores) => {
    try {
      await leaderboard.save(mode, category, scores);
    } catch (error) {
      console.error("Could not save round scores", error);
      throw error;
    }
  },
});

http.once("listening", () =>
  console.log(`Red Tetris API listening on port ${port}`),
);
