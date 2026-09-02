"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, CreditCard } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { registrationsApi } from "@/lib/api";
import { formatDate, titleCase } from "@/lib/utils";

export default function MyEventsPage() {
  const { data: registrations, isLoading } = useQuery({ queryKey: ["my-registrations"], queryFn: registrationsApi.mine });

  return (
    <div className="mx-auto max-w-4xl">
      <Reveal>
        <h1 className="font-display text-3xl text-text-hi">My events</h1>
        <p className="mt-1 text-text-mid">Every event you&apos;ve registered for — including payments in progress.</p>
      </Reveal>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : !registrations || registrations.length === 0 ? (
          <EmptyState title="No events yet" description="Once you register for an event, it'll show up here." />
        ) : (
          registrations.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg text-text-hi">{r.event.title}</h3>
                  <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
                  {r.payment && <Badge tone={statusTone(r.payment.status)}>Payment: {titleCase(r.payment.status)}</Badge>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-mid">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> {formatDate(r.event.start_at)}
                  </span>
                  {r.event.venue_name && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {r.event.venue_name}
                    </span>
                  )}
                </div>
              </div>
              {r.payment?.status === "pending" && r.payment.paystack_authorization_url ? (
                <a href={r.payment.paystack_authorization_url}>
                  <Button size="sm">
                    <CreditCard className="size-4" /> Complete payment
                  </Button>
                </a>
              ) : r.ticket ? (
                <Link href={`/dashboard/tickets/${r.ticket.id}`} className="text-sm font-medium text-violet hover:underline">
                  View ticket →
                </Link>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
