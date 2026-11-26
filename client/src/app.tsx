import { Card, Toast } from "@heroui/react";
import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useMatch, useNavigate } from "react-router-dom";
import { validName, validRoom } from "@game-core/protocol";
import brandMark from "@/assets/red-tetris-mark.png";
import { HomePage } from "@/pages/home-page";
import { LeaderboardPage } from "@/pages/leaderboard-page";
import { OpenRooms } from "@/pages/open-rooms";
import { RoomPage } from "@/pages/room/room-page";
import { useRoom } from "@/pages/room/use-room";

const pageWidth = "mx-auto w-[min(100%_-_2rem,72rem)]";
type RoomEntry = { room: string; name: string; lobbyOnly?: boolean };

function Brand() {
  return (
    <Link
      className="inline-flex shrink-0 items-center gap-2 text-xs font-bold tracking-[0.12em] whitespace-nowrap no-underline sm:gap-3 sm:text-sm"
      to="/"
      aria-label="Red Tetris home"
    >
      <img src={brandMark} className="w-6" alt="" />
      RED TETRIS
    </Link>
  );
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const atHome = Boolean(useMatch("/"));
  const roomRoute = useMatch("/:room/:playerName");
  const { room, playerName } = roomRoute?.params ?? {};
  const [pendingEntry, setPendingEntry] = useState<RoomEntry | null>(null);
  const [joinError, setJoinError] = useState("");
  const [playerNameDraft, setPlayerNameDraft] = useState("");
  const entry = atHome
    ? pendingEntry
    : validRoom(room) && validName(playerName)
      ? { room, name: playerName }
      : null;
  const session = useRoom(entry?.room, entry?.name, entry?.lobbyOnly);

  useEffect(() => {
    if (!atHome) {
      setPendingEntry(null);
      setJoinError("");
    } else if (pendingEntry) {
      if (session.join.status === "joined") {
        setPlayerNameDraft("");
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
            "mx-auto flex min-h-12 w-full max-w-[90rem] items-center justify-between gap-3 px-4 sm:min-h-14 sm:px-9"
          }
        >
          <Brand />
          <nav aria-label="Main" className="flex items-center gap-3 text-sm sm:gap-6">
            <NavLink className="nav-link" to="/rooms" end>Rooms</NavLink>
            <NavLink className="nav-link" to="/leaderboard">Leaderboard</NavLink>
          </nav>
        </div>
      </header>
      <main className={pageWidth + " min-h-0 flex-1 overflow-auto py-3 sm:py-4"}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                key={location.key}
                isJoining={pendingEntry !== null}
                joinError={joinError}
                playerNameDraft={playerNameDraft}
                onPlayerNameChange={setPlayerNameDraft}
                onRoomChange={() => setJoinError("")}
                onJoin={(room, name, lobbyOnly) => {
                  setJoinError("");
                  setPendingEntry({ room, name, lobbyOnly });
                }}
              />
            }
          />
          <Route path="/rooms" element={<OpenRooms />} />
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
