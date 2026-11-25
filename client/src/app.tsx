import { Card } from "@heroui/react";
import { Link, Route, Routes } from "react-router-dom";
import { HomePage } from "@/pages/home-page";
import { LeaderboardPage } from "@/pages/leaderboard-page";
import { RoomPage } from "@/pages/room/room-page";

const pageWidth = "mx-auto w-[min(100%_-_2rem,72rem)]";

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
  return (
    <>
      <header className="border-b border-border">
        <div
          className={
            pageWidth + " flex min-h-18 items-center justify-between gap-4"
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
      <main className={pageWidth + " pt-8 pb-12"}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/:room/:playerName" element={<RoomPage />} />
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
    </>
  );
}
