import { Alert, Button, Card, toast } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { Link, Navigate, useParams } from "react-router-dom";
import { validName, validRoom } from "@game-core/protocol";
import { OpponentsPanel } from "@/pages/room/opponents-panel";
import { PlayArea } from "@/pages/room/play-area";
import { PlayersPanel } from "@/pages/room/players-panel";
import type { RoomSession } from "@/pages/room/use-room";

const copyLabel = "Copy room name";

export function RoomPage({ session }: { session: RoomSession }) {
  const { room, playerName } = useParams();
  if (!validRoom(room) || !validName(playerName)) {
    return (
      <Card>
        <h1>Invalid room link</h1>
        <Link to="/">Enter a room name and player name</Link>
      </Card>
    );
  }
  if (session.join.status === "rejected" && session.join.code === "name_taken") {
    return (
      <Navigate
        to="/"
        replace
        state={{ room, name: playerName, message: session.join.message }}
      />
    );
  }
  return (
    <RoomView
      key={JSON.stringify([room, playerName])}
      room={room}
      session={session}
    />
  );
}

function RoomView({ room, session }: { room: string; session: RoomSession }) {
  const { snapshot, message, connected, start } = session;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room);
      toast.success("Room name copied");
    } catch {
      toast.danger("Could not copy the room name. Share " + room + " to invite someone.");
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 sm:gap-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <Link className="text-[0.9rem] text-muted hover:text-white" to="/">
            ← Rooms
          </Link>
          <h1 className="mt-1 mb-0 text-[clamp(1.6rem,4vw,2.5rem)] wrap-anywhere">
            {room}
          </h1>
        </div>
        <button
          type="button"
          className={buttonVariants({ isIconOnly: true, variant: "secondary" })}
          aria-label={copyLabel}
          title={copyLabel}
          onClick={copy}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4"
          >
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
        </button>
      </div>
      {message && (
        <Alert status="danger" className="shrink-0">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description role="alert">{message}</Alert.Description>
          </Alert.Content>
          {connected && !snapshot && (
            <Button variant="secondary" onPress={() => window.location.reload()}>
              Try again
            </Button>
          )}
        </Alert>
      )}
      {!snapshot && !message && (
        <p className="mb-0 shrink-0 text-muted" role="status">
          Connecting to room…
        </p>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[minmax(0,1fr)_min(14rem,48%)] items-start gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,21rem)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:gap-5">
        <PlayersPanel room={room} snapshot={snapshot} start={start} />
        <PlayArea snapshot={snapshot} />
        <OpponentsPanel
          opponents={snapshot?.opponents}
          roundActive={snapshot?.phase === "running"}
        />
      </div>
    </section>
  );
}
