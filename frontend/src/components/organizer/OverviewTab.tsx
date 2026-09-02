"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, DollarSign, Ticket, UserCheck, Users } from "lucide-react";
import { StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { organizerApi } from "@/lib/api";
import type { EventDetail } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export function OverviewTab({ event }: { event: EventDetail }) {
  const { data, isLoading } = useQuery({
    queryKey: ["event-dashboard", event.id],
    queryFn: () => organizerApi.eventDashboard(event.id),
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  const stats = [
    { label: "Registrations", value: data.total_registrations, icon: Users },
    { label: "Tickets sold", value: data.tickets_sold, icon: Ticket },
    { label: "Checked in", value: `${data.checked_in_count} (${data.attendance_rate.toFixed(0)}%)`, icon: UserCheck },
    { label: "Revenue", value: formatMoney(data.total_revenue, event.currency), icon: DollarSign },
    { label: "VIP attendance", value: data.vip_attendance, icon: CalendarCheck },
  ];

  return (
    <div>
      <StaggerGroup className="grid grid-cols-2 gap-4 sm:grid-cols-5">
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

      {data.pending_payments > 0 && (
        <div className="mt-5 rounded-xl border border-amber/30 bg-amber/10 p-4 text-sm text-amber">
          {data.pending_payments} payment{data.pending_payments > 1 ? "s" : ""} still pending confirmation.
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <h3 className="font-display text-lg text-text-hi">Ticket types</h3>
        <div className="mt-4 space-y-3">
          {data.by_ticket_type.map((tt) => (
            <div key={tt.name} className="flex items-center justify-between text-sm">
              <span className="text-text-hi">{tt.name}</span>
              <span className="text-text-mid">
                {tt.sold} sold{tt.capacity ? ` / ${tt.capacity}` : ""} · {formatMoney(tt.price, event.currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
