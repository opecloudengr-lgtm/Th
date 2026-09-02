"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi } from "@/lib/api";
import { formatDateTime, formatMoney, titleCase } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState("");
  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments", status],
    queryFn: () => adminApi.payments({ ...(status ? { status } : {}), page_size: "100" }),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-text-hi">Payments</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-low">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Attendee</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments?.map((p) => (
                <tr key={p.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3 font-mono text-xs text-text-mid">{p.reference}</td>
                  <td className="px-4 py-3 text-text-hi">{p.event_title}</td>
                  <td className="px-4 py-3 text-text-mid">{p.attendee_email}</td>
                  <td className="px-4 py-3 text-text-hi">{formatMoney(p.amount, p.currency)}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(p.status)}>{titleCase(p.status)}</Badge></td>
                  <td className="px-4 py-3 text-xs text-text-low">{formatDateTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
