import { Kbd } from "@heroui/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { emptyBoard } from "@game-core/game";
import type { RoundResult, Snapshot } from "@game-core/protocol";
import { BoardView } from "@/pages/room/board-view";

const blank = emptyBoard();
const controls = [
  { action: "Move", keys: ["←", "→"] },
  { action: "Rotate", keys: ["↑"] },
  { action: "Soft drop", keys: ["↓"] },
  { action: "Hard drop", keys: ["Space"] },
];

function BoardNotice({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="absolute inset-x-1 top-[39%] grid gap-1 border-y border-border bg-surface px-1 py-2 text-center text-xs sm:inset-x-2 sm:px-2 sm:text-sm"
      role="status"
    >
      <strong className="text-sm wrap-anywhere sm:text-lg">{title}</strong>
      {children}
    </div>
  );
}

function resultText(result: RoundResult | null): string {
  if (result?.kind === "winner") return result.name + " wins";
  if (result?.kind === "draw") return "Draw";
  return "Game over";
}

export function PlayArea({ snapshot }: { snapshot: Snapshot | null }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const roundActive = snapshot?.phase === "running";
  const eliminated =
    roundActive &&
    !snapshot.roster.some(({ id, alive }) => id === snapshot.selfId && alive);

  useEffect(() => {
    if (roundActive) boardRef.current?.focus({ preventScroll: true });
  }, [roundActive]);

  return (
    <div className="col-span-2 col-start-1 row-start-1 grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-1 md:col-span-1 md:col-start-2 md:gap-2">
      <div className="grid min-h-0 place-items-center [container-type:size]">
        <div className="relative w-[min(100%,50cqh,18rem)] rounded-lg border border-border bg-[#0b0a0e] p-1 sm:p-2">
          <BoardView
            board={snapshot?.board ?? blank}
            piece={snapshot?.piece ?? null}
            boardRef={boardRef}
          />
          {eliminated && (
            <BoardNotice title="You’re out">
              <span>Waiting for the round to finish.</span>
            </BoardNotice>
          )}
          {snapshot && !roundActive && (
            <BoardNotice
              title={
                snapshot.phase === "finished"
                  ? resultText(snapshot.result)
                  : "Waiting to start"
              }
            >
              {snapshot.scoreSave === "pending" && <span>Saving scores…</span>}
              {snapshot.scoreSave === "failed" && (
                <span>Scores could not be saved.</span>
              )}
              {snapshot.scoreSave === "saved" && (
                <Link to="/leaderboard">View leaderboard</Link>
              )}
            </BoardNotice>
          )}
        </div>
      </div>
      <dl className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {controls.map(({ action, keys }) => (
          <div className="grid justify-items-center gap-1" key={action}>
            <dt className="flex gap-1">
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </dt>
            <dd className="text-xs text-muted">{action}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
