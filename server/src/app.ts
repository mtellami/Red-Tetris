import { join } from "node:path";
import express from "express";
import { isCategory, isMode } from "#game/protocol";
import type { Leaderboard } from "./storage/leaderboard.js";

export function createApp(leaderboard: Leaderboard, clientDir?: string) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") return next();
    res
      .set("Allow", "GET, HEAD")
      .status(405)
      .json({ error: "method_not_allowed" });
  });

  const api = express.Router();
  api.get("/leaderboard", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const mode = req.query.mode ?? "scored";
    const category = req.query.category ?? "solo";
    if (!isMode(mode) || mode === "classic" || !isCategory(category)) {
      res.status(400).json({ error: "invalid_filter" });
      return;
    }

    try {
      res.json(await leaderboard.list(mode, category));
    } catch (error) {
      console.error("Could not read the leaderboard", error);
      res.status(503).json({ error: "leaderboard_unavailable" });
    }
  });
  api.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });
  app.use("/api", api);

  if (clientDir) {
    app.use(express.static(clientDir, { index: false, redirect: false }));
    app.use((req, res, next) => {
      res.vary("Accept");
      if (!req.accepts().some((type) => type.toLowerCase() === "text/html")) {
        return next();
      }
      res.sendFile(join(clientDir, "index.html"), (error) => {
        if (error) next(res.headersSent ? error : undefined);
      });
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });
  return app;
}
