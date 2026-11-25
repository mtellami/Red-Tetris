import { MODES } from "@game-core/protocol";
import type { Mode } from "@game-core/protocol";
import { Choice } from "@/components/choice";

export function ModeSelect<T extends Mode>({
  modes,
  value,
  onChange,
}: {
  modes: readonly T[];
  value: T;
  onChange: (mode: T) => void;
}) {
  return (
    <Choice
      label="Mode"
      value={value}
      options={modes.map((id) => ({ id, label: MODES[id].label }))}
      onChange={onChange}
    />
  );
}
