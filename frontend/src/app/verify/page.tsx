"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, ScanLine } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { eventsApi, staffApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";

export default function VerifyEventPickerPage() {
  const { user } = useAuth();
  const isOrganizer = user?.role === "organizer" || user?.role === "admin";

  const { data: myEvents, isLoading: l1 } = useQuery({
    queryKey: ["my-events"],
    queryFn: eventsApi.mine,
    enabled: isOrganizer,
  });
  const { data: staffEvents, isLoading: l2 } = useQuery({ queryKey: ["staff-my-events"], queryFn: staffApi.myEvents });

  const isLoading = l1 || l2;

  const combined = [
    ...(myEvents ?? []).map((e) => ({ id: e.id, title: e.title, start_at: e.start_at, venue_name: null as string | null, city: e.city })),
    ...(staffEvents ?? [])
      .filter((s) => s.event)
      .map((s) => ({ id: s.event!.id, title: s.event!.title, start_at: s.event!.start_at, venue_name: s.event!.venue_name, city: s.event!.city })),
  ].filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i);

  return (
    <div>
      <Reveal className="text-center">
        <ScanLine className="mx-auto size-10 text-violet" />
        <h1 className="mt-3 font-display text-2xl text-text-hi">Select an event to verify</h1>
        <p className="mt-1 text-sm text-text-mid">Choose which event's tickets you're checking at the door.</p>
      </Reveal>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : combined.length === 0 ? (
          <EmptyState title="No events to verify" description="You need to be an event organizer or added as staff to scan tickets." />
        ) : (
          combined.map((e) => (
            <Link key={e.id} href={`/verify/${e.id}`} className="block rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-violet/40">
              <h3 className="font-display text-lg text-text-hi">{e.title}</h3>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-mid">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> {formatDate(e.start_at)}
                </span>
                {e.venue_name && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {e.venue_name}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
