import { Card, Toast } from "@heroui/react";
import { useEffect, useState } from "react";
import { Link, Route, Routes, useMatch, useNavigate } from "react-router-dom";
import { validName, validRoom } from "@game-core/protocol";
import { HomePage } from "@/pages/home-page";
import { LeaderboardPage } from "@/pages/leaderboard-page";
import { RoomPage } from "@/pages/room/room-page";
import { useRoom } from "@/pages/room/use-room";

const pageWidth = "mx-auto w-[min(100%_-_2rem,72rem)]";
type RoomEntry = { room: string; name: string };

function Brand() {
  return (
    <Link
      className="inline-flex items-center gap-3 font-[850] tracking-[0.08em] no-underline"
      to="/"
      aria-label="Red Tetris home"
    >
      <span
        className="grid grid-cols-[repeat(3,0.37rem)] auto-rows-[0.37rem] gap-[0.1rem] text-accent *:rounded-[1px] *:bg-current"
        aria-hidden="true"
      >
        <i className="col-start-2" />
        <i className="col-start-1" />
        <i />
        <i />
      </span>
      RED TETRIS
    </Link>
  );
}

export function App() {
  const navigate = useNavigate();
  const atHome = Boolean(useMatch("/"));
  const roomRoute = useMatch("/:room/:playerName");
  const { room, playerName } = roomRoute?.params ?? {};
  const [pendingEntry, setPendingEntry] = useState<RoomEntry | null>(null);
  const [joinError, setJoinError] = useState("");
  const entry = atHome
    ? pendingEntry
    : validRoom(room) && validName(playerName)
      ? { room, name: playerName }
      : null;
  const session = useRoom(entry?.room, entry?.name);

  useEffect(() => {
    if (!atHome) {
      setPendingEntry(null);
      setJoinError("");
    } else if (pendingEntry) {
      if (session.join.status === "joined") {
        void navigate(
          "/" + encodeURIComponent(pendingEntry.room) +
          "/" + encodeURIComponent(pendingEntry.name),
        );
      } else if (session.join.status === "rejected") {
        setJoinError(session.join.message);
        setPendingEntry(null);
      }
    }
  }, [atHome, navigate, pendingEntry, session.join]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Toast.Provider placement="bottom end" />
      <header className="border-b border-border">
        <div
          className={
            pageWidth + " flex min-h-12 items-center justify-between gap-4 sm:min-h-14"
          }
        >
          <Brand />
          <Link
            className="text-[0.9rem] text-muted hover:text-white"
            to="/leaderboard"
          >
            Leaderboard
          </Link>
        </div>
      </header>
      <main className={pageWidth + " min-h-0 flex-1 overflow-auto py-3 sm:py-4"}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                isJoining={pendingEntry !== null}
                joinError={joinError}
                onJoin={(room, name) => {
                  setJoinError("");
                  setPendingEntry({ room, name });
                }}
              />
            }
          />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route
            path="/:room/:playerName"
            element={<RoomPage session={session} />}
          />
          <Route
            path="*"
            element={
              <Card>
                <h1>Page unavailable</h1>
                <Link to="/">Return home</Link>
              </Card>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
