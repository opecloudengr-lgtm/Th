"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Reveal } from "@/components/motion/Reveal";
import { TicketDisplay } from "@/components/TicketDisplay";
import { Skeleton } from "@/components/ui/Skeleton";
import { invitationsApi } from "@/lib/api";

export default function GuestTicketPage() {
  const { token } = useParams<{ token: string }>();

  const { data: registration, isLoading } = useQuery({
    queryKey: ["guest-ticket", token],
    queryFn: () => invitationsApi.guestTicket(token),
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
      <Reveal className="mb-8 text-center">
        <h1 className="font-display text-3xl text-text-hi">Your ticket</h1>
        <p className="mt-2 text-text-mid">Save the QR code below or download it as a PDF for entry.</p>
      </Reveal>

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : registration ? (
        <TicketDisplay registration={registration} qrUrl={invitationsApi.guestTicketQrUrl(token)} pdfUrl={invitationsApi.guestTicketPdfUrl(token)} />
      ) : (
        <p className="text-center text-text-mid">Ticket not found. Confirm your invitation first.</p>
      )}
    </div>
  );
}
