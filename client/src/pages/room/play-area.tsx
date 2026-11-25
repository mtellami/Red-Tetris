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
      className="absolute inset-x-2 top-[39%] grid gap-2 border-y border-border bg-surface px-2 py-4 text-center text-sm"
      role="status"
    >
      <strong className="text-lg wrap-anywhere">{title}</strong>
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
    <div className="grid justify-items-center gap-[0.85rem] [@media(475px<width<=700px)]:row-span-2">
      <div className="relative w-full max-w-72 rounded-lg border border-border bg-[#0b0a0e] p-2">
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
            {snapshot.scoreSave === "pending" && (
              <span>Saving scores…</span>
            )}
            {snapshot.scoreSave === "failed" && (
              <span>Scores could not be saved.</span>
            )}
            {snapshot.scoreSave === "saved" && (
              <Link to="/leaderboard">View leaderboard</Link>
            )}
          </BoardNotice>
        )}
      </div>
      <dl className="flex flex-wrap justify-center gap-3">
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
