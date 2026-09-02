"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { downloadWithAuth, organizerApi } from "@/lib/api";
import type { EventDetail } from "@/lib/types";
import { formatDateTime, titleCase } from "@/lib/utils";

export function ParticipantsTab({ event }: { event: EventDetail }) {
  const [q, setQ] = useState("");
  const [checkedIn, setCheckedIn] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["participants", event.id, q, checkedIn],
    queryFn: () => organizerApi.participants(event.id, { ...(q ? { q } : {}), ...(checkedIn ? { checked_in: checkedIn } : {}), page_size: "200" }),
  });

  const exportFile = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      await downloadWithAuth(organizerApi.exportUrl(event.id, format), `${event.slug}-participants.${format}`);
    } catch {
      toast.error("Export failed.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-text-hi">Participants</h3>
        <div className="flex gap-2">
          {(["csv", "xlsx", "pdf"] as const).map((f) => (
            <button key={f} onClick={() => exportFile(f)} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-text-mid hover:border-violet hover:text-violet cursor-pointer">
              <Download className="size-3.5" /> {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-low" />
          <Input placeholder="Search name, email, ticket code…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select value={checkedIn} onChange={(e) => setCheckedIn(e.target.value)} className="sm:w-48">
          <option value="">All attendees</option>
          <option value="true">Checked in</option>
          <option value="false">Not checked in</option>
        </Select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No participants yet" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-low">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">VIP</th>
                <th className="px-4 py-3">Seat</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((p) => (
                <tr key={p.registration_id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-hi">{p.full_name}</div>
                    <div className="text-xs text-text-low">{p.email}</div>
                  </td>
                  <td className="px-4 py-3 text-text-mid">
                    {p.ticket_type}
                    {p.ticket_code && <div className="font-mono text-xs text-text-low">{p.ticket_code}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {p.vip_level && p.vip_level !== "regular" ? (
                      <span className="flex items-center gap-1 text-amber">
                        <Sparkles className="size-3.5" /> {p.vip_label}
                      </span>
                    ) : (
                      <span className="text-text-low">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-mid">{p.seat_label ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.payment_status ? <Badge tone={statusTone(p.payment_status)}>{titleCase(p.payment_status)}</Badge> : <span className="text-text-low">Free</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.checked_in ? "emerald" : "neutral"}>{p.checked_in ? "Checked in" : "Not yet"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-low">{formatDateTime(p.registered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
