import { Alert, Button, Card } from "@heroui/react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { validName, validRoom } from "@game-core/protocol";
import { OpponentsPanel } from "@/pages/room/opponents-panel";
import { PlayArea } from "@/pages/room/play-area";
import { PlayersPanel } from "@/pages/room/players-panel";
import { useRoom } from "@/pages/room/use-room";

const spacedRow = "flex items-center justify-between gap-4";

export function RoomPage() {
  const { room, playerName } = useParams();
  if (!validRoom(room) || !validName(playerName)) {
    return (
      <Card>
        <h1>Invalid room link</h1>
        <Link to="/">Enter a room name and player name</Link>
      </Card>
    );
  }
  return (
    <RoomView
      key={JSON.stringify([room, playerName])}
      room={room}
      name={playerName}
    />
  );
}

function RoomView({ room, name }: { room: string; name: string }) {
  const { snapshot, message, connected, start } = useRoom(room, name);
  const [copyStatus, setCopyStatus] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room);
      setCopyStatus("Room name copied");
    } catch {
      setCopyStatus("Share the room name " + room);
    }
  };

  return (
    <section>
      <div className={spacedRow + " mb-6 flex-wrap"}>
        <div>
          <Link className="text-[0.9rem] text-muted hover:text-white" to="/">
            ← Rooms
          </Link>
          <h1 className="mt-2 mb-0 wrap-anywhere">{room}</h1>
        </div>
        <div className={spacedRow + " flex-wrap text-[0.85rem]"}>
          <Button variant="secondary" onPress={copy}>
            Copy room name
          </Button>
          {copyStatus && <span role="status">{copyStatus}</span>}
        </div>
      </div>
      {message && (
        <Alert status="danger" className="mb-4">
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
        <p className="text-muted" role="status">
          Connecting to room…
        </p>
      )}
      <div className="grid grid-cols-[minmax(11rem,1fr)_minmax(15rem,21rem)_minmax(11rem,1fr)] items-start gap-5 [@media(475px<width<=700px)]:grid-cols-[minmax(12rem,1fr)_minmax(11rem,1fr)] [@media(max-width:475px)]:grid-cols-1">
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
