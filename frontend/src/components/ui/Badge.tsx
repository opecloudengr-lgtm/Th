import { cn } from "@/lib/utils";

type Tone = "violet" | "amber" | "emerald" | "red" | "neutral" | "pink";

const toneClasses: Record<Tone, string> = {
  violet: "bg-violet/15 text-violet border-violet/30",
  amber: "bg-amber/15 text-amber border-amber/30",
  emerald: "bg-emerald/15 text-emerald border-emerald/30",
  red: "bg-red/15 text-red border-red/30",
  pink: "bg-pink/15 text-pink border-pink/30",
  neutral: "bg-surface-raised text-text-mid border-line",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  const map: Record<string, Tone> = {
    active: "emerald",
    confirmed: "emerald",
    success: "emerald",
    published: "emerald",
    used: "violet",
    pending: "amber",
    draft: "amber",
    revoked: "red",
    failed: "red",
    cancelled: "red",
    expired: "red",
  };
  return map[status] ?? "neutral";
}
