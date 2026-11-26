# Red Tetris

A networked falling-block puzzle for solo and multiplayer play.

Run `make` or `make up` to start the app with Docker. Use `make help` to list the shortcuts, or `make install` followed by `make dev` for local development.

## Run locally

Use Node.js 22.12 or newer and pnpm. The repository pins the pnpm version in `package.json`.

```sh
make install
pnpm dev
```

Open <http://localhost:5173> and enter a room and player name. A player can also open a direct link such as <http://localhost:5173/Arcade/Ada>. Other players can join with the same room name and their own player names.

During development, Vite serves the client on port 5173 and forwards `/api` and `/socket.io` to Express on port 3000. Use `pnpm dev:client` and `pnpm dev:server` to run them separately. Set the same `PORT` in both shells if you run Express on another port.

For a production build:

```sh
pnpm build
pnpm start
```

In production, Express serves the built client, the API, and Socket.IO on port 3000. Set `PORT` to override it. Bonus scores default to `data/leaderboard.json`. Set `LEADERBOARD_FILE` to use a different writable location. For local settings in a gitignored `.env`, use `node --env-file=.env dist/server/src/main.js` after building.

## Run with Docker Compose

```sh
make up
```

Open <http://localhost:3000>. Set `PORT` to change the published host port. Compose runs one application container with the Express server and the compiled client. Use `make down` to stop the app and keep its data. Use `make clean` to remove the containers, network, app image, and leaderboard volume. This deletes the saved scores.

## Play

| Input | Action |
| --- | --- |
| ← or → | Move left or right |
| ↑ | Rotate clockwise |
| ↓ | Soft drop one row |
| Space | Hard drop and lock |

The first player in a room hosts and chooses when to start each round. In multiplayer, everyone receives the same piece sequence. Clearing two or more lines raises the other players’ boards by one fewer penalty row than the number of lines cleared. The opponent displays show the height of the settled blocks in each column. The last survivor wins. In solo, the round ends when a piece cannot spawn.

| Mode | Rules |
| --- | --- |
| Classic | 500 ms gravity and no scoring |
| Scored Classic | Classic rules with scoring |
| Invisible Pieces | The falling piece becomes visible when it locks |
| Fast Gravity | 250 ms gravity with scoring |

A clear of one, two, three, or four rows in a bonus mode earns 100, 300, 500, or 800 points respectively. The leaderboard keeps the top ten results separately for each bonus mode and for solo and multiplayer.

## Architecture

One root `package.json` and lockfile cover the whole app. The client and server import game rules and protocol types from `game/`.

- `client/` contains the React SPA, Vite configuration, and browser entry point `client/index.html`. It builds `index.html`, `bundle.js`, and static assets into `client/dist/`.
- `server/` owns Express routing, Socket.IO events, room state, and score storage. Prototype-backed `Player`, `Piece`, and `Game` classes coordinate the game.
- `game/` contains the board rules in `game.ts`, their tests in `game.test.ts`, and the typed Socket.IO protocol in `protocol.ts`. The client uses `@game/` and the server uses `#game/`.
- `config/` contains the repo-wide TypeScript, test, and Docker configuration.

The browser sends `room:join` with a room and name, `round:start` with a mode and round ID, and `player:input` with a keyboard action and round ID. The server checks membership, host authority, and round IDs before updating state. Each `room:snapshot` includes the recipient’s board, the room roster and phase, opponents’ spectra, and the round result when available. Active games live in memory. The bonus leaderboard uses a local file for completed scores.

## Verify and evaluate

```sh
pnpm test:coverage
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Coverage must reach 70% for statements, functions, and lines and 50% for branches. The browser tests run against the production build.

1. Open `/Arcade/Ada` directly. Start a Classic solo round, try all controls, and hard drop in the center until top-out. Start another round, check that the board resets, and finish the round before adding a second player.
2. Open `/Arcade/Ben` in a second tab and `/Other/Cleo` in a third. Start Arcade from Ada’s tab. Hard drop and watch Ada’s spectrum change on Ben’s screen while Cleo stays in the lobby.
3. Try to join Arcade with a new name mid-round. Close Ada’s tab and confirm Ben wins, becomes host, and can start the next round.
4. Start each bonus mode. Check the invisible falling piece, faster gravity, and score display. Finish a scored round, select the corresponding mode and player category on the leaderboard, then restart the server and check that the entry remains.
