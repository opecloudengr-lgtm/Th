"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, DollarSign, PlusCircle, Ticket, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { eventsApi, organizerApi } from "@/lib/api";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

export default function OrganizerOverviewPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({ queryKey: ["organizer-overview"], queryFn: organizerApi.overview });
  const { data: events, isLoading: loadingEvents } = useQuery({ queryKey: ["my-events"], queryFn: eventsApi.mine });

  const stats = overview
    ? [
        { label: "Events", value: overview.total_events, icon: CalendarCheck },
        { label: "Registrations", value: overview.total_registrations, icon: Users },
        { label: "Tickets sold", value: overview.tickets_sold, icon: Ticket },
        { label: "Checked in", value: overview.checked_in_count, icon: UserCheck },
        { label: "Revenue", value: formatMoney(overview.total_revenue, "NGN"), icon: DollarSign },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-text-hi">Organizer dashboard</h1>
          <p className="mt-1 text-text-mid">Everything about your events, at a glance.</p>
        </div>
        <Link href="/organizer/events/new">
          <Button>
            <PlusCircle className="size-4" /> Create event
          </Button>
        </Link>
      </Reveal>

      {loadingOverview ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <StaggerGroup className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {stats.map((s) => (
            <StaggerItem key={s.label}>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <s.icon className="size-5 text-violet" />
                <div className="mt-3 font-display text-2xl text-text-hi">{s.value}</div>
                <div className="text-xs text-text-mid">{s.label}</div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      <Reveal delay={0.1} className="mt-10">
        <h2 className="font-display text-xl text-text-hi">Your events</h2>
        <div className="mt-4 space-y-3">
          {loadingEvents ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          ) : !events || events.length === 0 ? (
            <EmptyState
              title="No events yet"
              description="Create your first event — free or paid, public or invite-only."
              action={
                <Link href="/organizer/events/new">
                  <Button>Create your first event</Button>
                </Link>
              }
            />
          ) : (
            events.map((e) => (
              <Link key={e.id} href={`/organizer/events/${e.id}`} className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-violet/40">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg text-text-hi">{e.title}</h3>
                    <Badge tone={statusTone(e.status)}>{titleCase(e.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-text-mid">{formatDate(e.start_at)} · {titleCase(e.category)}</p>
                </div>
                <span className="text-sm font-medium text-violet">Manage →</span>
              </Link>
            ))
          )}
        </div>
      </Reveal>
    </div>
  );
}
