import { Button, Drawer } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MODES } from "@game/protocol";
import { RoomControls } from "@/components/room-controls";
import type { RoomControlsProps } from "@/components/room-controls";

export function RoomHeader({
  room,
  snapshot,
  selectMode,
  start,
  startLabel,
}: RoomControlsProps) {
  const navigate = useNavigate();
  const [controlsOpen, setControlsOpen] = useState(false);
  const isHost = snapshot !== null && snapshot.hostId === snapshot.selfId;
  const roundActive = snapshot?.phase === "running";
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
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 md:mx-[4.5%] md:flex-nowrap md:items-end md:gap-3">
      <div className="min-w-0 max-md:flex-[1_0_min(100%,9rem)]">
        <Link
          className="nav-link hidden text-xs md:inline md:text-sm"
          to="/rooms"
        >
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
            <p
              aria-live="polite"
              className="m-0 rounded-full border border-white/7 bg-surface px-2 py-1 text-[0.65rem] text-muted sm:px-3 sm:text-xs"
            >
              {roundActive ? (
                <>
                  <span>{MODES[snapshot.mode].label}</span>
                  <span className="hidden md:inline">
                    {" "}
                    · {snapshot.category === "solo" ? "Solo" : "Multiplayer"}
                  </span>
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
            <span
              aria-hidden="true"
              className="ml-0.5 size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current"
            />
          </Button>
        )}
        {isHost && (
          <Drawer isOpen={controlsOpen} onOpenChange={setControlsOpen}>
            <Drawer.Trigger
              aria-label="Room controls"
              className={buttonVariants({
                variant: "outline",
                isIconOnly: true,
                className:
                  "inline-flex size-9 rounded-lg bg-surface text-foreground md:hidden",
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
                    <RoomControls
                      room={room}
                      snapshot={snapshot}
                      selectMode={selectMode}
                      start={() => {
                        start();
                        setControlsOpen(false);
                      }}
                      startLabel={startLabel}
                    />
                  </Drawer.Body>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>
        )}
      </div>
    </div>
  );
}
