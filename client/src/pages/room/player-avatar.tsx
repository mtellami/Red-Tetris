export function PlayerAvatar({ name, host }: { name: string; host: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        "grid size-5 shrink-0 place-items-center rounded-full text-[0.625rem]/3 font-bold text-accent-foreground sm:size-7 sm:text-xs " +
        (host ? "bg-[#f6c84f]" : "bg-[#41cdc3]")
      }
    >
      {Array.from(name)[0]?.toUpperCase()}
    </span>
  );
}
