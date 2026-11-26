import type { Mode, Snapshot } from "@game/protocol";
import { InvitePanel } from "@/components/invite-panel";
import { ModePanel } from "@/components/mode-panel";
import { PlayersPanel } from "@/components/players-panel";

export type RoomControlsProps = {
  room: string;
  snapshot: Snapshot | null;
  selectMode: (mode: Mode) => void;
  start: () => void;
  startLabel: string;
};

export function RoomControls({
  room,
  snapshot,
  selectMode,
  start,
  startLabel,
}: RoomControlsProps) {
  return (
    <>
      {snapshot &&
        snapshot.hostId === snapshot.selfId &&
        snapshot.phase !== "running" && (
          <ModePanel
            mode={snapshot.selectedMode}
            selectMode={selectMode}
            start={start}
            startLabel={startLabel}
          />
        )}
      <PlayersPanel snapshot={snapshot} />
      <InvitePanel room={room} />
    </>
  );
}
