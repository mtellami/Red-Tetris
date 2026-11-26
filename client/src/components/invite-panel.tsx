import { Button, Card, toast } from "@heroui/react";
import { useId } from "react";

export function InvitePanel({ room }: { room: string }) {
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
