"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Mail, RefreshCw } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { devApi } from "@/lib/api";

export default function DevOutboxPage() {
  const { data: emails, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dev-outbox"],
    queryFn: devApi.outbox,
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <Reveal className="flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-violet">Dev tool</span>
          <h1 className="mt-2 font-display text-3xl font-medium text-text-hi">Outbox</h1>
          <p className="mt-2 text-text-mid">
            No SMTP provider is configured, so verification, password-reset, and ticket emails land here
            instead of a real inbox. Open one and click its button to continue &mdash; it&apos;s the same
            link a real email would contain.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-text-mid transition-colors hover:text-text-hi cursor-pointer"
          aria-label="Refresh"
        >
          <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
        </button>
      </Reveal>

      <div className="mt-8 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : isError ? (
          <EmptyState
            icon={<Mail className="size-8" />}
            title="Outbox unavailable"
            description="This page only works when the backend has DEBUG=true. If you're testing with your own backend/.env, set DEBUG=true and restart it -- or configure real SMTP settings to send actual email instead."
          />
        ) : !emails || emails.length === 0 ? (
          <EmptyState icon={<Mail className="size-8" />} title="No emails yet" description="Register, request a password reset, or buy a ticket to see it appear here." />
        ) : (
          emails.map((e) => (
            <a
              key={e.id}
              href={devApi.outboxUrl(e.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-violet/40"
            >
              <span className="truncate text-sm text-text-hi">{e.preview}</span>
              <ExternalLink className="size-4 shrink-0 text-text-low" />
            </a>
          ))
        )}
      </div>
    </div>
  );
}
