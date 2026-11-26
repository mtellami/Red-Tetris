import { Alert, Button, Card, Drawer, toast } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { useEffect, useId, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { MODES, validName, validRoom } from "@game-core/protocol";
import { ModePanel } from "@/pages/room/mode-panel";
import { OpponentsPanel } from "@/pages/room/opponents-panel";
import { PlayArea } from "@/pages/room/play-area";
import { PlayersPanel } from "@/pages/room/players-panel";
import type { RoomSession } from "@/pages/room/use-room";

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
  const navigate = useNavigate();
  const { snapshot, message, connected, selectMode, start, canPlay, sendInput } = session;
  const [controlsOpen, setControlsOpen] = useState(false);
  const isHost = snapshot !== null && snapshot.hostId === snapshot.selfId;
  const roundActive = snapshot?.phase === "running";
  const startLabel = snapshot?.phase === "finished" ? "Start next round" : "Start round";
  const goBack = () => {
    // BrowserRouter starts its history index at zero on a direct visit.
    if (window.history.state?.idx > 0) {
      void navigate(-1);
    } else {
      void navigate("/rooms", { replace: true });
    }
  };

  useEffect(() => {
    if (!controlsOpen) return;
    if (!isHost) {
      setControlsOpen(false);
      return;
    }
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setControlsOpen(false);
    };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [controlsOpen, isHost]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 sm:gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 md:mx-[4.5%] md:flex-nowrap md:items-end md:gap-3">
        <div className="min-w-0 max-md:flex-[1_0_min(100%,9rem)]">
          <Link className="nav-link hidden text-xs md:inline md:text-sm" to="/rooms">
            ← Rooms
          </Link>
          <div className="flex min-w-0 items-center gap-1">
            <Button
              variant="ghost"
              isIconOnly
              className="size-11 shrink-0 rounded-xl text-xl text-foreground md:hidden"
              aria-label="Go back"
              onPress={goBack}
            >
              <span aria-hidden="true">←</span>
            </Button>
            <h1 className="mb-0 min-w-0 text-[clamp(1.5rem,4vw,2.5rem)] wrap-anywhere md:mt-2">
              {room}
            </h1>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {snapshot && (
            <div className="grid justify-items-end gap-1">
              <p aria-live="polite" className="m-0 rounded-full border border-white/7 bg-surface px-2 py-1 text-[0.65rem] text-muted sm:px-3 sm:text-xs">
                {roundActive ? (
                  <>
                    <span>{MODES[snapshot.mode].label}</span>
                    <span className="hidden md:inline"> · {snapshot.category === "solo" ? "Solo" : "Multiplayer"}</span>
                  </>
                ) : (
                  <>
                    <span className="hidden md:inline">Next round · </span>
                    <span>{MODES[snapshot.selectedMode].label}</span>
                  </>
                )}
              </p>
              {snapshot.score !== null && (
                <p className="m-0 px-1 text-xs text-muted md:hidden">
                  Score <strong className="text-accent">{snapshot.score}</strong>
                </p>
              )}
            </div>
          )}
          {isHost && (
            <Button
              isIconOnly
              className="size-9 rounded-lg md:hidden"
              aria-label={startLabel}
              isDisabled={roundActive}
              onPress={start}
            >
              <span aria-hidden="true" className="ml-0.5 size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
            </Button>
          )}
          {isHost && (
            <Drawer isOpen={controlsOpen} onOpenChange={setControlsOpen}>
              <Drawer.Trigger
                aria-label="Room controls"
                className={buttonVariants({
                  variant: "outline",
                  isIconOnly: true,
                  className: "inline-flex size-9 rounded-lg bg-surface text-foreground md:hidden",
                })}
              >
                <span aria-hidden="true" className="grid w-4 gap-1.5">
                  <span className="relative h-0.5 rounded-full bg-foreground">
                    <span className="absolute top-1/2 left-1 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
                  </span>
                  <span className="relative h-0.5 rounded-full bg-foreground">
                    <span className="absolute top-1/2 right-1 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
                  </span>
                </span>
              </Drawer.Trigger>
              <Drawer.Backdrop>
                <Drawer.Content placement="right">
                  <Drawer.Dialog className="border-l border-border bg-background p-4">
                    <Drawer.Header className="flex-row items-center justify-between">
                      <Drawer.Heading>Room controls</Drawer.Heading>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="tertiary"
                        className="size-11 rounded-xl text-xl"
                        aria-label="Close room controls"
                        onPress={() => setControlsOpen(false)}
                      >
                        <span aria-hidden="true">×</span>
                      </Button>
                    </Drawer.Header>
                    <Drawer.Body className="grid content-start gap-3 text-foreground">
                      {!roundActive && (
                        <ModePanel
                          mode={snapshot.selectedMode}
                          selectMode={selectMode}
                          startLabel={startLabel}
                          start={() => {
                            start();
                            setControlsOpen(false);
                          }}
                        />
                      )}
                      <PlayersPanel snapshot={snapshot} />
                      <InvitePanel room={room} />
                    </Drawer.Body>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
          )}
        </div>
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
      <div className="mx-auto grid w-full min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] items-start gap-2 md:max-w-[min(75vw,58rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:gap-5 md:pt-2 lg:max-w-[min(70vw,58rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,clamp(15rem,22vw,18rem))_minmax(0,1fr)] lg:gap-7">
        <div className="col-start-1 row-start-1 hidden max-h-full min-w-0 gap-3 overflow-auto md:grid">
          {isHost && !roundActive && (
            <ModePanel mode={snapshot.selectedMode} selectMode={selectMode} start={start} startLabel={startLabel} />
          )}
          <PlayersPanel snapshot={snapshot} />
          <InvitePanel room={room} />
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

function InvitePanel({ room }: { room: string }) {
  const headingId = useId();
  const invite = new URL("/", window.location.origin);
  invite.searchParams.set("room", room);
  const inviteUrl = invite.href;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.danger("Could not copy the link automatically. Copy it from the Invite someone panel.");
    }
  };


  return (
    <Card<"section">
      className="design-card gap-1 p-3 md:p-4"
      render={(props) => <section {...props} aria-labelledby={headingId} />}
    >
      <h2 className="mb-0 text-xs sm:text-sm" id={headingId}>Invite someone</h2>
      <p className="mb-1 text-xs text-muted">Share the room link to play together.</p>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
        <input
          className="w-full min-w-0 rounded-lg border border-border bg-field px-2 py-1.5 text-xs text-foreground"
          aria-label="Invite link"
          value={inviteUrl}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          isIconOnly
          size="sm"
          variant="secondary"
          className="size-8 min-w-8 rounded-lg text-foreground"
          aria-label="Copy invite link"
          onPress={copy}
        >
          <span
            aria-hidden="true"
            className="relative block size-[18px] shrink-0"
          >
            <span className="absolute top-0 left-0 size-3 rounded-tl-[3px] border-t-2 border-l-2 border-current" />
            <span className="absolute right-0 bottom-0 size-3 rounded-[3px] border-2 border-current" />
          </span>
        </Button>
      </div>
    </Card>
  );
}
