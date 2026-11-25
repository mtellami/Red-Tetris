import { Card } from "@heroui/react";
import { HEIGHT } from "@game-core/game";
import type { Snapshot } from "@game-core/protocol";

function Spectrum({
  name,
  heights,
  out,
}: {
  name: string;
  heights: number[];
  out: boolean;
}) {
  return (
    <div className="border-t border-border py-1 wrap-anywhere md:py-2.5">
      <div className="flex items-center justify-between gap-4">
        <strong>{name}</strong>
        {out && <span className="text-muted">Out</span>}
      </div>
      <div
        className="mt-1 grid h-10 grid-cols-10 items-end gap-0.5 border-b border-border bg-field md:mt-2 md:h-15"
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
  roundActive,
}: {
  opponents?: Snapshot["opponents"];
  roundActive: boolean;
}) {
  return (
    <Card<"aside">
      className="col-start-2 row-start-2 max-h-full min-w-0 gap-1.5 overflow-auto p-2 md:col-start-3 md:row-start-1 md:gap-3 md:p-4"
      render={(props) => <aside {...props} />}
    >
      <h2 className="mb-0">Opponents</h2>
      {opponents?.length ? (
        opponents.map(({ id, name, heights, alive }) => (
          <Spectrum
            key={id}
            name={name}
            heights={heights}
            out={roundActive && !alive}
          />
        ))
      ) : (
        <p className="mb-0 text-sm text-muted">
          Opponent boards appear here when other players join.
        </p>
      )}
    </Card>
  );
}
