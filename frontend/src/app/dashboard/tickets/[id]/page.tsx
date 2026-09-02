"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { TicketDisplay } from "@/components/TicketDisplay";
import { Skeleton } from "@/components/ui/Skeleton";
import { registrationsApi, ticketsApi } from "@/lib/api";

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: registrations, isLoading } = useQuery({ queryKey: ["my-registrations"], queryFn: registrationsApi.mine });
  const registration = registrations?.find((r) => r.ticket?.id === id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/tickets" className="mb-6 flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi">
        <ArrowLeft className="size-4" /> Back to my tickets
      </Link>

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : registration ? (
        <Reveal>
          <TicketDisplay registration={registration} qrUrl={ticketsApi.qrUrl(id)} pdfUrl={ticketsApi.pdfUrl(id)} />
        </Reveal>
      ) : (
        <p className="text-center text-text-mid">Ticket not found.</p>
      )}
    </div>
  );
}
