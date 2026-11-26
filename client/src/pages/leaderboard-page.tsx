import { buttonVariants } from "@heroui/styles";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import emptyMark from "@/assets/empty-leaderboard-mark.png";
import { MODES } from "@game/protocol";
import type {
  Category,
  LeaderboardEntry,
  ScoredMode,
} from "@game/protocol";

const modes = (["scored", "invisible", "fast"] as const).map((id) => ({
  id,
  label: MODES[id].label,
}));
const categories = [
  { id: "solo", label: "Solo" },
  { id: "multiplayer", label: "Multiplayer" },
] as const;
const standingsRow = "grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center";

function ScoreFilter<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm text-foreground">{label}</legend>
      <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-white/7 bg-surface p-1">
        {options.map(({ id, label }) => (
          <label key={id} className="cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name={name}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <span className="block rounded-lg px-3 py-1.5 text-sm font-semibold text-muted hover:text-foreground peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LeaderboardPage() {
  const [mode, setMode] = useState<ScoredMode>("scored");
  const [category, setCategory] = useState<Category>("solo");
  const [data, setData] = useState<{
    filter: string;
    scores?: LeaderboardEntry[];
  }>({ filter: "" });
  const filter = new URLSearchParams({ mode, category }).toString();
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/leaderboard?" + filter, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Leaderboard unavailable");
        const scores = (await response.json()) as LeaderboardEntry[];
        if (!controller.signal.aborted) setData({ filter, scores });
      })
      .catch(() => {
        if (!controller.signal.aborted) setData({ filter });
      });
    return () => controller.abort();
  }, [filter]);

  return (
    <section className="mx-auto max-w-[37rem] pt-4 pb-4 sm:pt-9">
      <h1 className="mb-3 text-[clamp(2rem,4.5vw,3.5rem)]">Leaderboard</h1>
      <p className="mb-4 text-sm text-muted sm:mb-5">Top scores by mode and room size.</p>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
        <ScoreFilter label="Mode" name="mode" options={modes} value={mode} onChange={setMode} />
        <ScoreFilter label="Players" name="category" options={categories} value={category} onChange={setCategory} />
      </div>
      <div className="design-card overflow-hidden">
        <div role="table" aria-label="Leaderboard standings">
          <div role="row" className={standingsRow + " border-b border-white/7 text-[0.7rem] font-medium tracking-widest text-muted uppercase"}>
            <span role="columnheader" className="py-3 pl-4 sm:pl-6">Rank</span>
            <span role="columnheader" className="px-3 py-3">Player</span>
            <span role="columnheader" className="py-3 pr-4 text-right sm:pr-6">Score</span>
          </div>
          <div role="rowgroup">
            {data.filter === filter && data.scores?.map(({ name, score, completedAt }, index) => (
              <div role="row" key={completedAt + "-" + index} className={standingsRow + " border-b border-white/7 last:border-b-0"}>
                <span role="cell" className="py-3 pl-4 text-muted tabular-nums sm:pl-6">{index + 1}</span>
                <span role="rowheader" className="px-3 py-3 font-semibold wrap-anywhere">{name}</span>
                <span role="cell" className="py-3 pr-4 text-right tabular-nums sm:pr-6">{score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        {data.filter !== filter ? (
          <p className="m-0 p-6 text-muted" role="status">Loading scores…</p>
        ) : !data.scores ? (
          <p role="alert" className="m-0 p-6 text-danger">The leaderboard is unavailable.</p>
        ) : data.scores.length === 0 && (
          <div className="grid justify-items-center px-5 py-8 text-center sm:py-13">
            <img src={emptyMark} className="mb-5 w-10 sm:mb-8" alt="" />
            <h2 className="mb-2 text-xl">No scores yet.</h2>
            <p className="mb-5 text-sm text-muted">Start a scored round to be the first name on the board.</p>
            <Link className={buttonVariants({ className: "rounded-lg no-underline" })} to="/">Play a game</Link>
          </div>
        )}
      </div>
    </section>
  );
}
