import { Card } from "@heroui/react";
import { HEIGHT } from "@game/game";
import type { Snapshot } from "@game/protocol";
import { PlayerAvatar } from "@/components/player-avatar";

function Spectrum({
  name,
  heights,
  out,
  host,
}: {
  name: string;
  heights: number[];
  out: boolean;
  host: boolean;
}) {
  return (
    <div className="w-[5.5rem] shrink-0 snap-start rounded-lg border border-white/7 bg-surface p-1.5 md:w-auto md:rounded-none md:border-0 md:bg-transparent md:p-0">
      <div className="flex items-center gap-1 text-xs md:gap-2 md:text-sm">
        <PlayerAvatar name={name} host={host} />
        <strong className="min-w-0 flex-1 truncate md:overflow-visible md:text-wrap md:wrap-anywhere">{name}</strong>
        {out && <span className="text-[0.625rem] text-muted md:text-sm">Out</span>}
      </div>
      <div
        className="mt-1 grid h-8 grid-cols-10 items-end gap-px overflow-hidden rounded-md border border-white/7 bg-field md:mt-2 md:h-18 md:rounded-lg"
        role="img"
        aria-label={name + " column heights: " + heights.join(", ")}
      >
        {heights.map((height, column) => (
          <div
            key={column}
            className="bg-accent"
            style={{ height: (height / HEIGHT) * 100 + "%" }}
          />
        ))}
      </div>
    </div>
  );
}

export function OpponentsPanel({
  opponents,
  hostId,
  roundActive,
}: {
  opponents?: Snapshot["opponents"];
  hostId?: string;
  roundActive: boolean;
}) {
  return (
    <Card<"aside">
      className={`design-card col-start-1 row-start-1 max-h-full min-w-0 gap-1.5 p-0 max-md:rounded-none max-md:border-0 max-md:bg-transparent md:col-start-3 md:gap-3 md:overflow-auto md:p-4 ${opponents?.length ? "" : "max-md:hidden"}`}
      render={(props) => <aside {...props} />}
    >
      <h2 className="mb-0 text-sm md:text-base">Opponents</h2>
      {opponents?.length ? (
        <div
          role="group"
          aria-label="Opponent boards"
          className="flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain md:grid md:gap-3 md:overflow-visible"
        >
          {opponents.map(({ id, name, heights, alive }) => (
            <Spectrum
              key={id}
              name={name}
              heights={heights}
              host={id === hostId}
              out={roundActive && !alive}
            />
          ))}
        </div>
      ) : (
        <p className="mb-0 text-sm text-muted">
          Opponent boards appear here when other players join.
        </p>
      )}
    </Card>
  );
}
