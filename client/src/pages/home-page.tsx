import { Button, Card, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { validName, validRoom } from "@game-core/protocol";

function JoinField({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <TextField name={name} isRequired>
      <Label>{label}</Label>
      <Input variant="secondary" maxLength={24} placeholder={placeholder} />
    </TextField>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const enter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    navigate("/" + encodeURIComponent(room) + "/" + encodeURIComponent(name));
  };

  return (
    <section className="grid grid-cols-[1fr_minmax(17rem,24rem)] items-center gap-[clamp(2rem,8vw,7rem)] py-[clamp(2rem,8vw,7rem)] [@media(max-width:700px)]:grid-cols-1">
      <div>
        <h1 className="mb-[1.65rem] text-[clamp(4.6rem,12vw,9rem)] leading-[0.82] font-black">
          Red
          <br />
          <span className="text-accent">Tetris</span>
        </h1>
        <p className="mb-0 max-w-[31ch] text-[1.1rem] leading-[1.55] text-muted">
          Stack pieces, clear lines, and outlast your opponents. Play solo or
          share your room with friends.
        </p>
      </div>
      <Card className="p-[clamp(1.25rem,4vw,2rem)]">
        <form className="grid gap-4" onSubmit={enter}>
          <h2 className="mb-0 text-xl">Join a room</h2>
          <JoinField
            name="room"
            label="Room name"
            placeholder="e.g. Friday Game"
          />
          <JoinField name="name" label="Player name" placeholder="Your name" />
          {error && (
            <p role="alert" className="mb-0 text-danger">
              {error}
            </p>
          )}
          <Button className="justify-between" type="submit">
            Enter room <span aria-hidden="true">→</span>
          </Button>
        </form>
      </Card>
    </section>
  );
}
