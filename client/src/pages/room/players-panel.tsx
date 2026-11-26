import { Card } from "@heroui/react";
import type { Snapshot } from "@game-core/protocol";
import { PlayerAvatar } from "@/pages/room/player-avatar";

export function PlayersPanel({ snapshot }: { snapshot: Snapshot | null }) {
  const roundActive = snapshot?.phase === "running";
  const isHost = snapshot?.hostId === snapshot?.selfId;

  return (
    <Card<"aside">
      className="design-card min-w-0 gap-1.5 p-2 md:gap-3 md:p-4"
      render={(props) => <aside {...props} />}
    >
      <h2 className="mb-0 shrink-0">Players</h2>
      {snapshot && (
        <>
          <ul className="grid min-h-0 gap-1 overflow-y-auto">
            {snapshot.roster.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-2 border-b border-white/7 py-1.5 wrap-anywhere last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PlayerAvatar name={player.name} host={player.id === snapshot.hostId} />
                  <strong className="min-w-0 text-xs sm:text-sm">
                    {player.name}
                    {player.id === snapshot.selfId && <span className="font-normal text-muted"> (you)</span>}
                  </strong>
                </div>
                <span className="text-right text-xs text-muted empty:hidden">
                  {player.id === snapshot.hostId && (
                    <span className="rounded-full bg-accent/12 px-1.5 py-0.5 whitespace-nowrap text-danger">Host</span>
                  )}
                  {roundActive && !player.alive && <span className="block">Out</span>}
                </span>
              </li>
            ))}
          </ul>
          {snapshot.score !== null && (
            <p className="mb-0 text-sm">
              Score{" "}
              <strong className="ml-[0.3rem] text-accent">
                {snapshot.score}
              </strong>
            </p>
          )}
          {!roundActive && !isHost && (
            <p className="mb-0 text-sm text-muted">Waiting for the host to start.</p>
          )}
        </>
      )}
    </Card>
  );
}
