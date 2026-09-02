"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { eventsApi } from "@/lib/api";
import { cn, titleCase } from "@/lib/utils";

import { OverviewTab } from "@/components/organizer/OverviewTab";
import { TicketsTab } from "@/components/organizer/TicketsTab";
import { DesignTab } from "@/components/organizer/DesignTab";
import { SeatingTab } from "@/components/organizer/SeatingTab";
import { ParticipantsTab } from "@/components/organizer/ParticipantsTab";
import { StaffTab } from "@/components/organizer/StaffTab";
import { InvitationsTab } from "@/components/organizer/InvitationsTab";
import { SettingsTab } from "@/components/organizer/SettingsTab";

const baseTabs = [
  { key: "overview", label: "Overview" },
  { key: "tickets", label: "Tickets" },
  { key: "design", label: "Design" },
  { key: "seating", label: "Seating" },
  { key: "participants", label: "Participants" },
  { key: "staff", label: "Staff" },
  { key: "settings", label: "Settings" },
] as const;

export default function ManageEventPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<string>("overview");

  const { data: event, isLoading, refetch } = useQuery({
    queryKey: ["event-manage", id],
    queryFn: () => eventsApi.manage(id),
  });

  const tabs = event?.registration_mode === "private" ? [...baseTabs.slice(0, 4), { key: "invitations", label: "Invitations" } as const, ...baseTabs.slice(4)] : baseTabs;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!event) return <p className="text-text-mid">Event not found.</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl text-text-hi">{event.title}</h1>
            <Badge tone={statusTone(event.status)}>{titleCase(event.status)}</Badge>
          </div>
          <p className="mt-1 text-text-mid">{titleCase(event.category)} · {titleCase(event.registration_mode)}</p>
        </div>
        {event.status === "published" && (
          <Link href={`/events/${event.slug}`} target="_blank" className="flex items-center gap-1.5 text-sm text-violet hover:underline">
            View public page <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium cursor-pointer",
              tab === t.key ? "border-violet text-text-hi" : "border-transparent text-text-mid hover:text-text-hi"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <OverviewTab event={event} />}
        {tab === "tickets" && <TicketsTab event={event} onChange={refetch} />}
        {tab === "design" && <DesignTab event={event} onChange={refetch} />}
        {tab === "seating" && <SeatingTab event={event} />}
        {tab === "invitations" && <InvitationsTab event={event} />}
        {tab === "participants" && <ParticipantsTab event={event} />}
        {tab === "staff" && <StaffTab event={event} />}
        {tab === "settings" && <SettingsTab event={event} onChange={refetch} />}
      </div>
    </div>
  );
}
