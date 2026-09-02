"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { eventsApi } from "@/lib/api";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

export default function OrganizerEventsPage() {
  const { data: events, isLoading } = useQuery({ queryKey: ["my-events"], queryFn: eventsApi.mine });

  return (
    <div className="mx-auto max-w-6xl">
      <Reveal className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-text-hi">My events</h1>
          <p className="mt-1 text-text-mid">Draft, published, and past events you organize.</p>
        </div>
        <Link href="/organizer/events/new">
          <Button>
            <PlusCircle className="size-4" /> Create event
          </Button>
        </Link>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
        ) : !events || events.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              title="No events yet"
              description="Create your first event to start selling tickets or inviting guests."
              action={
                <Link href="/organizer/events/new">
                  <Button>Create your first event</Button>
                </Link>
              }
            />
          </div>
        ) : (
          events.map((e) => (
            <Link key={e.id} href={`/organizer/events/${e.id}`} className="group overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-violet/40">
              <div
                className="h-28 bg-cover bg-center p-4"
                style={
                  e.cover_image_url
                    ? { backgroundImage: `url(${e.cover_image_url})` }
                    : { background: `linear-gradient(135deg, ${e.theme_color}55, #0b0a10)` }
                }
              >
                <Badge tone={statusTone(e.status)} className="bg-ink/60 backdrop-blur">{titleCase(e.status)}</Badge>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg text-text-hi group-hover:text-violet">{e.title}</h3>
                <div className="mt-2 space-y-1 text-sm text-text-mid">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> {formatDate(e.start_at)}
                  </div>
                  {e.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {e.city}
                    </div>
                  )}
                </div>
                <div className="mt-3 border-t border-line pt-3 text-sm font-medium text-text-hi">
                  {e.is_free ? "Free" : `From ${formatMoney(e.min_price ?? 0, e.currency)}`}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
