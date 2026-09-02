"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Ticket as TicketIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { registrationsApi } from "@/lib/api";
import { cn, formatDate, titleCase } from "@/lib/utils";

const tabs = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
] as const;

export default function MyTicketsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("upcoming");
  const { data: registrations, isLoading } = useQuery({ queryKey: ["my-registrations"], queryFn: registrationsApi.mine });

  const now = new Date();
  const filtered = (registrations ?? []).filter((r) => {
    if (tab === "upcoming") return new Date(r.event.end_at) > now;
    if (tab === "past") return new Date(r.event.end_at) <= now;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Reveal>
        <h1 className="font-display text-3xl text-text-hi">My tickets</h1>
        <p className="mt-1 text-text-mid">Every event you&apos;ve registered for, free or paid.</p>
      </Reveal>

      <Reveal delay={0.05} className="mt-6 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium cursor-pointer",
              tab === t.key ? "bg-gradient-to-r from-violet to-pink text-white" : "border border-line text-text-mid hover:text-text-hi"
            )}
          >
            {t.label}
          </button>
        ))}
      </Reveal>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <EmptyState icon={<TicketIcon className="size-8" />} title="No tickets here" description="Events you register for will show up in this list." />
        ) : (
          filtered.map((r) => (
            <Link
              key={r.id}
              href={r.ticket ? `/dashboard/tickets/${r.ticket.id}` : "#"}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-violet/40 sm:p-5"
            >
              <div
                className="hidden size-16 shrink-0 rounded-xl bg-cover bg-center sm:block"
                style={
                  r.event.cover_image_url
                    ? { backgroundImage: `url(${r.event.cover_image_url})` }
                    : { background: `linear-gradient(135deg, ${r.event.theme_color}66, #0b0a10)` }
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-lg text-text-hi">{r.event.title}</h3>
                  <Badge tone={statusTone(r.ticket?.status ?? r.status)}>{titleCase(r.ticket?.status ?? r.status)}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-mid">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> {formatDate(r.event.start_at)}
                  </span>
                  {r.event.venue_name && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {r.event.venue_name}
                    </span>
                  )}
                  <span>{r.ticket_type.name}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
