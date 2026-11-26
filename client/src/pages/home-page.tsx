import { Alert, Button, Card, Input, Label, TextField } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, Ref } from "react";
import { useLocation } from "react-router-dom";
import { validName, validRoom } from "@game/protocol";

function JoinField({
  name,
  label,
  placeholder,
  defaultValue,
  value,
  onChange,
  inputRef,
  isJoining,
}: {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  isJoining: boolean;
}) {
  return (
    <TextField name={name} defaultValue={defaultValue} value={value} onChange={onChange} isRequired isDisabled={isJoining}>
      <Label>{label}</Label>
      <Input ref={inputRef} className="w-full min-w-0 rounded-lg border border-border bg-background" variant="secondary" maxLength={24} placeholder={placeholder} />
    </TextField>
  );
}

export function HomePage({
  isJoining,
  joinError,
  playerNameDraft,
  onPlayerNameChange,
  onJoin,
  onRoomChange,
}: {
  isJoining: boolean;
  joinError: string;
  playerNameDraft: string;
  onPlayerNameChange: (name: string) => void;
  onJoin: (room: string, name: string, lobbyOnly: boolean) => void;
  onRoomChange: () => void;
}) {
  const { search, state } = useLocation();
  const initial = state as {
    room: string;
    name?: string;
    message?: string;
  } | null;
  const params = new URLSearchParams(search);
  const invitedRoom = params.get("room");
  const listedRoom = params.get("openRoom");
  const selectedRoom = !initial && validRoom(listedRoom) ? listedRoom : undefined;
  const [roomName, setRoomName] = useState(initial?.room ?? selectedRoom ?? (validRoom(invitedRoom) ? invitedRoom : ""));
  const [lobbyOnly, setLobbyOnly] = useState(Boolean(selectedRoom));
  const [error, setError] = useState(initial?.message ?? "");
  const playerField = useRef<HTMLInputElement>(null);
  const feedback = error || joinError;
  useEffect(() => {
    if (selectedRoom) playerField.current?.focus();
  }, [selectedRoom]);

  const changeRoom = (room: string) => {
    setRoomName(room);
    setLobbyOnly(false);
    setError("");
    onRoomChange();
  };
  const enter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isJoining) return;
    const data = new FormData(event.currentTarget);
    const room = String(data.get("room") ?? "").trim();
    const name = String(data.get("name") ?? "").trim();
    if (!validRoom(room) || !validName(name)) {
      setError(
        room.toLowerCase() === "api"
          ? "Choose a different room name. “api” is reserved."
          : "Use 1–24 letters, numbers, spaces, hyphens, or underscores.",
      );
      return;
    }
    setError("");
    onJoin(room, name, lobbyOnly);
  };

  return (
    <section className="mx-auto grid min-h-full max-w-[min(100%,76rem)] grid-cols-[minmax(0,1fr)] content-center items-center gap-3 py-2 sm:gap-5 sm:py-8 md:max-w-[87vw] md:grid-cols-[1fr_minmax(18rem,30.6vw)] md:gap-[clamp(2rem,8vw,7rem)]">
      <div>
        <p className="mb-6 hidden w-fit items-center gap-2 rounded-full border border-white/7 bg-surface px-3 py-1 text-xs text-foreground md:flex">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[#41cdc3]" />
          Real-time multiplayer
        </p>
        <h1 className="mb-2 text-[clamp(2.25rem,7.8vw,6.5rem)] leading-[0.92] md:mb-6">
          Red{" "}
          <br className="hidden md:block" />
          <span className="text-accent">Tetris</span>
        </h1>
        <p className="mb-0 max-w-[37ch] text-sm leading-snug text-muted md:text-base md:leading-relaxed">
          Stack pieces, clear lines, and outlast your opponents. Play solo or
          share your room with friends.
        </p>
      </div>
      <Card className="design-card min-w-0 p-3 sm:p-4 md:p-7">
        <form className="grid min-w-0 gap-2.5 sm:gap-4" onSubmit={enter} aria-busy={isJoining} aria-describedby="join-room-hint">
          <div>
            <h2 className="mb-1 text-xl tracking-tight md:text-2xl">Join a room</h2>
            <p className="mb-0 text-xs leading-relaxed text-muted" id="join-room-hint">
              {lobbyOnly || (validRoom(invitedRoom) && roomName === invitedRoom) ? "Enter your player name to join this room." : "New names create rooms. Existing names join them."}
            </p>
          </div>
          <JoinField
            name="room"
            label="Room name"
            placeholder="e.g. Friday Game"
            value={roomName}
            onChange={changeRoom}
            isJoining={isJoining}
          />
          <JoinField
            name="name"
            label="Player name"
            placeholder="Your name"
            defaultValue={initial?.name ?? playerNameDraft}
            onChange={onPlayerNameChange}
            inputRef={playerField}
            isJoining={isJoining}
          />
          {feedback && (
            <Alert status="danger" className="p-2 sm:p-3">
              <Alert.Indicator>
                <span aria-hidden="true" className="font-bold">!</span>
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Description role="alert" className="mb-0">
                  {feedback}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          <Button className="min-h-10 w-full rounded-lg" type="submit" isDisabled={isJoining}>
            {isJoining ? "Joining…" : "Enter room"}{" "}
            <span aria-hidden="true">→</span>
          </Button>
        </form>
      </Card>
    </section>
  );
}
