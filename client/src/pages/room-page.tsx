import { Alert, Button, Card } from "@heroui/react";
import { Link, Navigate, useParams } from "react-router-dom";
import { validName, validRoom } from "@game/protocol";
import { OpponentsPanel } from "@/components/opponents-panel";
import { PlayArea } from "@/components/play-area";
import { RoomControls } from "@/components/room-controls";
import { RoomHeader } from "@/components/room-header";
import type { RoomSession } from "@/hooks/use-room";

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
  const { snapshot, message, connected, selectMode, start, canPlay, sendInput } = session;
  const roundActive = snapshot?.phase === "running";
  const startLabel = snapshot?.phase === "finished" ? "Start next round" : "Start round";

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 sm:gap-3">
      <RoomHeader
        room={room}
        snapshot={snapshot}
        selectMode={selectMode}
        start={start}
        startLabel={startLabel}
      />
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
      <div className="mx-auto grid w-full min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] items-start gap-2 md:max-w-[min(75vw,58rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:gap-5 md:pt-2 lg:max-w-[min(70vw,58rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,clamp(15rem,22vw,18rem))_minmax(0,1fr)] lg:gap-7">
        <div className="col-start-1 row-start-1 hidden max-h-full min-w-0 gap-3 overflow-auto md:grid">
          <RoomControls
            room={room}
            snapshot={snapshot}
            selectMode={selectMode}
            start={start}
            startLabel={startLabel}
          />
        </div>
        <PlayArea snapshot={snapshot} canPlay={canPlay} sendInput={sendInput} />
        <OpponentsPanel
          opponents={snapshot?.opponents}
          hostId={snapshot?.hostId}
          roundActive={roundActive}
        />
      </div>
    </section>
  );
}
