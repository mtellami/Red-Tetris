import { Button } from "@heroui/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { emptyBoard } from "@game/game";
import type { Action } from "@game/game";
import type { RoundResult, Snapshot } from "@game/protocol";
import { BoardView } from "@/components/board-view";
import { GameControls } from "@/components/game-controls";

const blank = emptyBoard();

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

function RoundResultNotice({
  result,
  scoreSave,
}: Pick<Snapshot, "result" | "scoreSave">) {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 grid place-items-center bg-background/65 p-1 sm:p-3">
      <div className="w-full max-w-52 rounded-lg border border-border bg-surface px-1 py-2 text-center shadow-lg sm:rounded-xl sm:px-4 sm:py-4">
        <div role="status" className="grid gap-1">
          <strong className="text-sm leading-tight font-bold tracking-tight wrap-anywhere sm:text-xl">
            {resultText(result)}
          </strong>
          {scoreSave === "pending" && (
            <span className="text-xs text-muted">Saving scores…</span>
          )}
          {scoreSave === "failed" && (
            <span className="text-xs text-muted">
              Scores could not be saved.
            </span>
          )}
        </div>
        {scoreSave === "saved" && (
          <Button
            size="sm"
            className="mt-2 h-auto min-h-8 max-w-full min-w-0 rounded-lg px-1.5 py-1 text-[0.6875rem] leading-tight wrap-anywhere whitespace-normal sm:px-3 sm:text-sm"
            onPress={() => void navigate("/leaderboard")}
          >
            View leaderboard
          </Button>
        )}
      </div>
    </div>
  );
}

export function PlayArea({
  snapshot,
  canPlay,
  sendInput,
}: {
  snapshot: Snapshot | null;
  canPlay: boolean;
  sendInput: (action: Action) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const roundActive = snapshot?.phase === "running";
  const eliminated =
    roundActive &&
    !snapshot.roster.some(({ id, alive }) => id === snapshot.selfId && alive);

  useEffect(() => {
    if (roundActive) boardRef.current?.focus({ preventScroll: true });
  }, [roundActive]);

  return (
    <div className="col-start-1 row-start-2 flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-2 [container-type:size] md:col-start-2 md:row-start-1 md:justify-start">
      <div className="relative w-[min(100%,calc(50cqh-1.75rem),18rem)] shrink-0 overflow-hidden rounded-lg border border-border bg-[#222026] shadow-[0_0_2.5rem_#ff53661a] md:w-[min(100%,calc(50cqh-1.6rem),18rem)]">
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
        {snapshot?.phase === "lobby" && (
          <BoardNotice title="Waiting to start">
            {snapshot.hostId !== snapshot.selfId && (
              <span className="text-muted md:hidden">
                Waiting for the host to start.
              </span>
            )}
          </BoardNotice>
        )}
        {snapshot?.phase === "finished" && (
          <RoundResultNotice
            result={snapshot.result}
            scoreSave={snapshot.scoreSave}
          />
        )}
      </div>
      <GameControls canPlay={canPlay} sendInput={sendInput} />
    </div>
  );
}
