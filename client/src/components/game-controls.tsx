import { Button, Kbd } from "@heroui/react";
import type { Action } from "@game/game";

const controls = [
  { action: "Move", keys: ["←", "→"] },
  { action: "Rotate", keys: ["↑"] },
  { action: "Soft drop", keys: ["↓"] },
  { action: "Hard drop", keys: ["Space"] },
];
const touchControls = [
  { action: "left", label: "Move left", icon: "←" },
  { action: "softDrop", label: "Soft drop", icon: "↓" },
  { action: "rotate", label: "Rotate", icon: "↻" },
  { action: "hardDrop", label: "Hard drop", icon: "⤓" },
  { action: "right", label: "Move right", icon: "→" },
] as const;

export function GameControls({
  canPlay,
  sendInput,
}: {
  canPlay: boolean;
  sendInput: (action: Action) => void;
}) {
  return (
    <>
      <div
        role="group"
        aria-label="Game controls"
        className="grid w-full max-w-88 shrink-0 grid-cols-5 gap-1.5 md:hidden"
      >
        {touchControls.map(({ action, label, icon }) => (
          <Button
            key={action}
            isIconOnly
            variant={action === "hardDrop" ? "primary" : "tertiary"}
            className="h-11 w-full min-w-0 touch-manipulation rounded-xl text-[1.375rem] leading-none"
            aria-label={label}
            isDisabled={!canPlay}
            onPress={() => sendInput(action)}
          >
            <span aria-hidden="true">{icon}</span>
          </Button>
        ))}
      </div>
      <dl className="hidden shrink-0 justify-center gap-2 text-nowrap md:flex">
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
    </>
  );
}
