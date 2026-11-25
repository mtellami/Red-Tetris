import type { Ref } from "react";
import { coordinates, WIDTH } from "@game-core/game";
import type { Board, Cell, FallingPiece } from "@game-core/game";

const cellBackgrounds: Record<NonNullable<Cell>, string> = {
  I: "bg-[#55c9dc]",
  J: "bg-[#657afd]",
  L: "bg-[#f6a04b]",
  O: "bg-[#edcd5a]",
  S: "bg-[#60cd88]",
  T: "bg-[#bb89ff]",
  Z: "bg-[#fa6473]",
  penalty:
    "bg-[repeating-linear-gradient(135deg,#74717d_0_3px,#5a5762_3px_6px)]",
};

export function BoardView({
  board,
  piece,
  boardRef,
}: {
  board: Board;
  piece: FallingPiece | null;
  boardRef?: Ref<HTMLDivElement>;
}) {
  const falling = new Set(
    piece ? coordinates(piece).map(([x, y]) => y * WIDTH + x) : [],
  );
  return (
    <div
      ref={boardRef}
      className="grid aspect-[1/2] grid-cols-10 grid-rows-20 gap-px focus-visible:outline-none"
      role="img"
      tabIndex={0}
      aria-label="Your playing field, 10 columns by 20 rows"
    >
      {board.flatMap((row, y) =>
        row.map((settled, x) => {
          const index = y * WIDTH + x;
          const active = falling.has(index);
          const cell = active ? piece?.kind : settled;
          return (
            <div
              key={index}
              className={
                "rounded-[1px] " +
                (cell ? cellBackgrounds[cell] : "bg-[#19171d]")
              }
              data-cell={cell ?? "empty"}
              data-falling={active || undefined}
            />
          );
        }),
      )}
    </div>
  );
}
