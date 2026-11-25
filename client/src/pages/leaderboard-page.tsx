import { Card } from "@heroui/react";
import { useEffect, useState } from "react";
import type {
  Category,
  LeaderboardEntry,
  ScoredMode,
} from "@game-core/protocol";
import { Choice } from "@/components/choice";
import { ModeSelect } from "@/components/mode-select";

const bonusModes = ["scored", "invisible", "fast"] as const;
const categories = [
  { id: "solo", label: "Solo" },
  { id: "multiplayer", label: "Multiplayer" },
] as const;

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
    <section className="mx-auto max-w-2xl">
      <h1>Leaderboard</h1>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <ModeSelect modes={bonusModes} value={mode} onChange={setMode} />
          <Choice
            label="Players"
            value={category}
            options={categories}
            onChange={setCategory}
          />
        </div>
        {data.filter !== filter ? (
          <p role="status">Loading scores…</p>
        ) : !data.scores ? (
          <p role="alert" className="text-danger">
            The leaderboard is unavailable.
          </p>
        ) : data.scores.length === 0 ? (
          <p className="text-muted">No scores yet.</p>
        ) : (
          <ol className="mt-[1em] list-decimal pl-6">
            {data.scores.map(({ name, score, completedAt }, index) => (
              <li
                key={completedAt + "-" + index}
                className="border-t border-border py-2 wrap-anywhere"
              >
                <div className="flex justify-between gap-[0.6rem]">
                  <strong>{name}</strong>
                  <span className="tabular-nums">{score.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}
