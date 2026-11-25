import { Alert, Button, Card, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { validName, validRoom } from "@game-core/protocol";

function JoinField({
  name,
  label,
  placeholder,
  defaultValue,
  isJoining,
}: {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  isJoining: boolean;
}) {
  return (
    <TextField name={name} defaultValue={defaultValue} isRequired isDisabled={isJoining}>
      <Label>{label}</Label>
      <Input variant="secondary" maxLength={24} placeholder={placeholder} />
    </TextField>
  );
}

export function HomePage({
  isJoining,
  joinError,
  onJoin,
}: {
  isJoining: boolean;
  joinError: string;
  onJoin: (room: string, name: string) => void;
}) {
  const initial = useLocation().state as {
    room: string;
    name: string;
    message: string;
  } | null;
  const [error, setError] = useState(initial?.message ?? "");
  const feedback = error || joinError;
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
    onJoin(room, name);
  };

  return (
    <section className="grid min-h-full content-center items-center gap-4 py-2 sm:grid-cols-2 md:grid-cols-[1fr_minmax(17rem,24rem)] md:gap-[clamp(2rem,8vw,7rem)]">
      <div>
        <h1 className="mb-3 text-[clamp(2.75rem,10vw,9rem)] leading-[0.82] font-black md:mb-6">
          Red{" "}
          <br className="hidden sm:block" />
          <span className="text-accent">Tetris</span>
        </h1>
        <p className="mb-0 max-w-[31ch] text-sm text-muted md:text-lg">
          Stack pieces, clear lines, and outlast your opponents. Play solo or
          share your room with friends.
        </p>
      </div>
      <Card className="p-4 md:p-[clamp(1.25rem,4vw,2rem)]">
        <form className="grid gap-3" onSubmit={enter} aria-busy={isJoining}>
          <h2 className="mb-0 text-xl">Join a room</h2>
          <JoinField
            name="room"
            label="Room name"
            placeholder="e.g. Friday Game"
            defaultValue={initial?.room}
            isJoining={isJoining}
          />
          <JoinField
            name="name"
            label="Player name"
            placeholder="Your name"
            defaultValue={initial?.name}
            isJoining={isJoining}
          />
          {feedback && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description role="alert" className="mb-0">
                  {feedback}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          <Button className="justify-between" type="submit" isDisabled={isJoining}>
            {isJoining ? "Joining…" : "Enter room"}{" "}
            <span aria-hidden="true">→</span>
          </Button>
        </form>
      </Card>
    </section>
  );
}
