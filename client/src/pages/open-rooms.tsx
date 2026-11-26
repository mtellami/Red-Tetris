import { buttonVariants } from "@heroui/styles";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import emptyMark from "@/assets/empty-leaderboard-mark.png";
import { MODES } from "@game-core/protocol";
import type { ClientEvents, Mode, OpenRoom, ServerEvents } from "@game-core/protocol";

const roomModes = Object.keys(MODES) as Mode[];

export function OpenRooms() {
  const [rooms, setRooms] = useState<OpenRoom[] | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const visibleRooms = mode === null ? rooms : rooms?.filter((room) => room.mode === mode);

  useEffect(() => {
    const socket: Socket<ServerEvents, ClientEvents> = io({ autoConnect: false, forceNew: true });
    const connectionLost = () => {
      setRooms(null);
      setReconnecting(true);
    };
    socket.on("connect", () => socket.emit("rooms:watch"));
    socket.on("rooms:open", (openRooms) => {
      setRooms(openRooms);
      setReconnecting(false);
    });
    socket.on("disconnect", connectionLost);
    socket.on("connect_error", connectionLost);
    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  return (
    <section className="mx-auto max-w-[37rem] pt-4 pb-4 sm:pt-9" aria-labelledby="open-rooms-heading">
      <h1 id="open-rooms-heading" className="mb-5">Open rooms</h1>
      <fieldset className="mb-4 min-w-0">
        <legend className="sr-only">Mode</legend>
        <div className="flex flex-wrap gap-2">
          {roomModes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              className={buttonVariants({ size: "sm", variant: mode === option ? "primary" : "tertiary", className: "rounded-lg" })}
              onClick={() => setMode((selected) => selected === option ? null : option)}
            >
              {MODES[option].label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="design-card overflow-hidden">
        {!visibleRooms ? (
          <p role="status" className="m-0 p-6 text-muted">
            {reconnecting ? "Reconnecting to open rooms…" : "Loading open rooms…"}
          </p>
        ) : visibleRooms.length === 0 ? (
          <div className="grid justify-items-center px-5 py-8 text-center sm:py-13">
            <img src={emptyMark} className="mb-5 w-10 sm:mb-8" alt="" />
            <div role="status">
              <h2 className="mb-2 text-xl">
                {mode === null ? "No open rooms right now." : `No open rooms for ${MODES[mode].label}.`}
              </h2>
            </div>
            <p className="mb-5 text-sm text-muted">Warm up solo or invite friends to your own room.</p>
            <Link className={buttonVariants({ className: "rounded-lg no-underline" })} to="/">Start a room</Link>
          </div>
        ) : (
          <ul className="px-4 py-2 sm:px-6">
            {visibleRooms.map(({ room, playerCount, mode }) => (
              <li key={room} className="flex items-center justify-between gap-3 border-b border-white/7 py-3 last:border-b-0">
                <div className="min-w-0 text-sm wrap-anywhere">
                  <div className="font-semibold">{room}</div>
                  <div className="text-xs text-muted">
                    {playerCount} {playerCount === 1 ? "player" : "players"} · {MODES[mode].label}
                  </div>
                </div>
                <Link
                  to={{ pathname: "/", search: "?" + new URLSearchParams({ openRoom: room }) }}
                  className={buttonVariants({ size: "sm", variant: "secondary", className: "shrink-0 rounded-lg no-underline" })}
                  aria-label={`Join ${room}`}
                >
                  Join
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
