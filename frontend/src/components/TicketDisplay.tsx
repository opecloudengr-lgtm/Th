"use client";

import { motion } from "framer-motion";
import { Download, Loader2, MapPin, Sparkles } from "lucide-react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuthedAsset } from "@/hooks/useAuthedAsset";
import type { Registration } from "@/lib/types";
import { formatDateTime, titleCase } from "@/lib/utils";

export function TicketDisplay({
  registration,
  qrUrl,
  pdfUrl,
}: {
  registration: Registration;
  qrUrl: string;
  pdfUrl: string;
}) {
  const ticket = registration.ticket;
  const event = registration.event;
  const { objectUrl: qrSrc } = useAuthedAsset(ticket ? qrUrl : null);
  const { objectUrl: pdfSrc, loading: pdfLoading } = useAuthedAsset(ticket ? pdfUrl : null);

  if (!ticket) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center text-text-mid">
        {registration.payment?.status === "pending"
          ? "Payment pending — your ticket will appear here once payment is confirmed."
          : "Ticket not yet issued."}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-xl">
      <div
        className="ticket-stub relative overflow-hidden border border-line"
        style={{ background: `linear-gradient(135deg, ${event.theme_color}22, var(--surface-raised))` }}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="flex-1 p-7">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-text-low">EventPass</span>
              <Badge tone={statusTone(ticket.status)}>{titleCase(ticket.status)}</Badge>
            </div>
            <h2 className="mt-3 font-display text-2xl text-text-hi">{event.title}</h2>
            <div className="mt-2 text-sm text-text-mid">{formatDateTime(event.start_at)}</div>
            {(event.venue_name || event.city) && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-text-mid">
                <MapPin className="size-3.5" /> {event.venue_name}
                {event.city ? `, ${event.city}` : ""}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-low">Attendee</div>
                <div className="text-sm font-medium text-text-hi">{registration.full_name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-low">Ticket type</div>
                <div className="text-sm font-medium text-text-hi">{registration.ticket_type.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-low">VIP level</div>
                <div className="flex items-center gap-1 text-sm font-medium text-text-hi">
                  {ticket.vip_level !== "regular" && <Sparkles className="size-3.5 text-amber" />}
                  {ticket.custom_vip_label || titleCase(ticket.vip_level)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-low">Seat</div>
                <div className="text-sm font-medium text-text-hi">{ticket.seat ? `${ticket.seat.section} ${ticket.seat.row_label}${ticket.seat.number}` : "General"}</div>
              </div>
            </div>
          </div>

          <div className="ticket-perf hidden sm:block" />

          <div className="flex flex-col items-center justify-center gap-3 p-7">
            <div className="flex size-[140px] items-center justify-center rounded-xl bg-white p-2.5">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt="Ticket QR code" width={124} height={124} />
              ) : (
                <Loader2 className="size-6 animate-spin text-ink" />
              )}
            </div>
            <div className="font-mono text-xs tracking-widest text-text-low">{ticket.ticket_code}</div>
          </div>
        </div>
      </div>

      <a href={pdfSrc ?? undefined} download={`${ticket.ticket_code}.pdf`} className="mt-5 block">
        <Button fullWidth variant="secondary" disabled={!pdfSrc} loading={pdfLoading}>
          <Download className="size-4" /> Download PDF ticket
        </Button>
      </a>
    </motion.div>
  );
}
