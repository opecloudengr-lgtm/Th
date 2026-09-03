import { cn } from "@/lib/utils";

/**
 * The Nexora brand mark: a center node connected to three outer nodes --
 * organizer, attendee, and venue meeting at one secure point. Deliberately
 * not a literal ticket icon, so it reads as a mark in its own right rather
 * than a stock glyph in a gradient circle.
 */
export function NexoraMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size, height: size, background: "linear-gradient(135deg, var(--violet), var(--pink))" }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 12L12 5.2M12 12L6.2 17M12 12L17.8 17" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="5.2" r="1.8" fill="white" />
        <circle cx="6.2" cy="17" r="1.8" fill="white" />
        <circle cx="17.8" cy="17" r="1.8" fill="white" />
        <circle cx="12" cy="12" r="2.3" fill="white" />
      </svg>
    </span>
  );
}
