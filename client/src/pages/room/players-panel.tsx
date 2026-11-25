import { Button, Card } from "@heroui/react";
import { useState } from "react";
import { MODES } from "@game-core/protocol";
import type { Mode, Snapshot } from "@game-core/protocol";
import { ModeSelect } from "@/components/mode-select";

const roomModes = Object.keys(MODES) as Mode[];

export function PlayersPanel({
  room,
  snapshot,
  start,
}: {
  room: string;
  snapshot: Snapshot | null;
  start: (mode: Mode) => void;
}) {
  const [mode, setMode] = useState<Mode>("classic");
  const roundActive = snapshot?.phase === "running";
  const isHost = snapshot?.hostId === snapshot?.selfId;
  const inviteUrl =
    window.location.origin + "/" + encodeURIComponent(room) + "/";

  return (
    <Card<"aside">
      className="col-start-1 row-start-2 max-h-full min-w-0 gap-1.5 overflow-auto p-2 md:row-start-1 md:gap-3 md:p-4"
      render={(props) => <aside {...props} />}
    >
      <h2 className="mb-0">Players</h2>
      {snapshot && (
        <>
          <ul className="grid gap-1">
            {snapshot.roster.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-2 border-b border-border py-1 wrap-anywhere md:py-2"
              >
                <strong>
                  {player.name}
                  {player.id === snapshot.selfId ? " (you)" : ""}
                </strong>
                <span className="text-muted">
                  {[
                    player.id === snapshot.hostId && "Host",
                    roundActive && !player.alive && "Out",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
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
          {!roundActive && isHost && (
            <div className="grid gap-1.5 md:gap-3">
              <ModeSelect
                modes={roomModes}
                value={mode}
                onChange={setMode}
              />
              <Button className="w-full" onPress={() => start(mode)}>
                {snapshot.phase === "finished"
                  ? "Start next round"
                  : "Start round"}
              </Button>
            </div>
          )}
          {!roundActive && !isHost && (
            <p className="mb-0 text-sm text-muted">Waiting for the host to start.</p>
          )}
          {roundActive && (
            <p className="mb-0 text-sm text-muted">
              {MODES[snapshot.mode].label} ·{" "}
              {snapshot.category === "solo" ? "Solo" : "Multiplayer"}
            </p>
          )}
        </>
      )}
      <details>
        <summary className="cursor-pointer text-[0.875rem] text-muted">
          How to invite someone
        </summary>
        <p className="mt-[0.65rem] mb-0 text-sm text-muted">
          Tell them to enter <strong>{room}</strong> and their own player name
          on the home page. They can also add their name after{" "}
          <span className="wrap-anywhere">{inviteUrl}</span>
        </p>
      </details>
    </Card>
  );
}
