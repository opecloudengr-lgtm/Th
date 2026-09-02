"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MapPin, Sparkles, Ticket as TicketIcon } from "lucide-react";
import Link from "next/link";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { Badge, statusTone } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { registrationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, titleCase } from "@/lib/utils";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { data: registrations, isLoading } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: registrationsApi.mine,
  });

  const upcoming = registrations?.filter((r) => new Date(r.event.end_at) > new Date() && r.status !== "cancelled") ?? [];
  const activeTickets = registrations?.filter((r) => r.ticket?.status === "active").length ?? 0;
  const usedTickets = registrations?.filter((r) => r.ticket?.status === "used").length ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <Reveal>
        <h1 className="font-display text-3xl text-text-hi">Welcome back, {user?.first_name} 👋</h1>
        <p className="mt-1 text-text-mid">Here&apos;s what&apos;s coming up for you.</p>
      </Reveal>

      {!user?.is_email_verified && (
        <Reveal delay={0.05} className="mt-6 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-sm text-amber">
          Your email isn&apos;t verified yet — you can browse, but you&apos;ll need to verify before registering for events.
        </Reveal>
      )}

      <StaggerGroup className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Upcoming events", value: upcoming.length, icon: CalendarClock },
          { label: "Active tickets", value: activeTickets, icon: TicketIcon },
          { label: "Checked in", value: usedTickets, icon: Sparkles },
        ].map((stat) => (
          <StaggerItem key={stat.label}>
            <div className="rounded-2xl border border-line bg-surface p-5">
              <stat.icon className="size-5 text-violet" />
              <div className="mt-3 font-display text-3xl text-text-hi">{stat.value}</div>
              <div className="text-sm text-text-mid">{stat.label}</div>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <Reveal delay={0.1} className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-text-hi">Upcoming events</h2>
          <Link href="/dashboard/tickets" className="text-sm text-violet hover:underline">
            View all tickets
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={<TicketIcon className="size-8" />}
              title="No upcoming events yet"
              description="Browse public events and grab a ticket — free or paid."
              action={
                <Link href="/events" className="rounded-full bg-gradient-to-r from-violet to-pink px-5 py-2.5 text-sm font-medium text-white">
                  Browse events
                </Link>
              }
            />
          ) : (
            upcoming.map((r) => (
              <Link key={r.id} href={r.ticket ? `/dashboard/tickets/${r.ticket.id}` : "/dashboard/tickets"} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-violet/40 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg text-text-hi">{r.event.title}</h3>
                    <Badge tone={statusTone(r.ticket?.status ?? r.status)}>{titleCase(r.ticket?.status ?? r.status)}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-mid">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" /> {formatDateTime(r.event.start_at)}
                    </span>
                    {r.event.venue_name && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" /> {r.event.venue_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-violet">{r.ticket ? "View ticket →" : "View status →"}</span>
              </Link>
            ))
          )}
        </div>
      </Reveal>
    </div>
  );
}
