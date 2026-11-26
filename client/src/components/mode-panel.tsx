import { Button, Card } from "@heroui/react";
import { MODES } from "@game/protocol";
import type { Mode } from "@game/protocol";
import { ModeSelect } from "@/components/mode-select";

const roomModes = Object.keys(MODES) as Mode[];

export function ModePanel({
  mode,
  selectMode,
  start,
  startLabel,
}: {
  mode: Mode;
  selectMode: (mode: Mode) => void;
  start: () => void;
  startLabel: string;
}) {
  return (
    <Card<"section">
      className="design-card min-w-0 gap-3 p-3 md:p-4"
      render={(props) => <section {...props} aria-label="Game mode" />}
    >
      <ModeSelect modes={roomModes} value={mode} onChange={selectMode} />
      <Button className="w-full" onPress={start}>
        {startLabel}
      </Button>
    </Card>
  );
}
