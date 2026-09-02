"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, CreditCard, DollarSign, Ticket, Users } from "lucide-react";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

export default function AdminReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-reports"], queryFn: adminApi.reports });

  const stats = data
    ? [
        { label: "Total users", value: data.total_users, icon: Users },
        { label: "Organizers", value: data.total_organizers, icon: Users },
        { label: "Events", value: `${data.total_events} (${data.published_events} live)`, icon: CalendarCheck },
        { label: "Registrations", value: data.total_registrations, icon: Ticket },
        { label: "Tickets issued", value: data.total_tickets_issued, icon: Ticket },
        { label: "Revenue", value: formatMoney(data.total_revenue, "NGN"), icon: DollarSign },
        { label: "Check-ins", value: data.total_checkins, icon: CheckCircle2 },
        { label: "Payment success rate", value: `${data.payment_success_rate.toFixed(0)}%`, icon: CreditCard },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <Reveal>
        <h1 className="font-display text-3xl text-text-hi">Platform reports</h1>
        <p className="mt-1 text-text-mid">A live snapshot of everything happening on EventPass.</p>
      </Reveal>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <StaggerGroup className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
    </div>
  );
}
