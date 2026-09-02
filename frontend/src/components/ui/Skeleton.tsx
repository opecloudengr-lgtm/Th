import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-lg", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "size-5 animate-spin rounded-full border-2 border-line border-t-violet",
        className
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-8 py-16 text-center">
      {icon && <div className="mb-4 text-text-low">{icon}</div>}
      <h3 className="font-display text-lg text-text-hi">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-text-mid">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
