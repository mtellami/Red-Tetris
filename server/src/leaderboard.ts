import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  Category,
  LeaderboardEntry,
  ScoredMode,
} from "#game-core/protocol";

type Rankings = Partial<
  Record<`${ScoredMode}:${Category}`, LeaderboardEntry[]>
>;

const hasPoints = ({ score }: LeaderboardEntry) => score > 0;

export class Leaderboard {
  private pending = Promise.resolve();

  constructor(private readonly file: string) {}

  async list(mode: ScoredMode, category: Category) {
    await this.pending;
    return ((await this.read())[`${mode}:${category}`] ?? []).filter(hasPoints);
  }

  save(mode: ScoredMode, category: Category, scores: LeaderboardEntry[]) {
    const rankedScores = scores.filter(hasPoints);
    if (rankedScores.length === 0) return this.pending;

    const write = this.pending.then(async () => {
      const rankings = await this.read();
      const key = `${mode}:${category}` as const;
      const previousScores = (rankings[key] ?? []).filter(hasPoints);
      rankings[key] = [...previousScores, ...rankedScores]
        .sort(
          (a, b) =>
            b.score - a.score || a.completedAt.localeCompare(b.completedAt),
        )
        .slice(0, 10);
      await mkdir(dirname(this.file), { recursive: true });
      const temporary = `${this.file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(rankings), { flag: "wx" });
        await rename(temporary, this.file);
      } finally {
        await rm(temporary, { force: true });
      }
    });
    this.pending = write.catch(() => {});
    return write;
  }

  private async read(): Promise<Rankings> {
    try {
      return JSON.parse(await readFile(this.file, "utf8")) as Rankings;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }
}
