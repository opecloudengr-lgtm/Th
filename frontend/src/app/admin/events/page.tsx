"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiException, adminApi } from "@/lib/api";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

export default function AdminEventsPage() {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery({ queryKey: ["admin-events"], queryFn: () => adminApi.events({ page_size: "100" }) });

  const suspend = async (id: string) => {
    if (!confirm("Suspend this event? It will be cancelled immediately.")) return;
    try {
      await adminApi.suspendEvent(id);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Event suspended.");
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not suspend event.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl text-text-hi">Events</h1>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-low">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Organizer</th>
                <th className="px-4 py-3">Registrations</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events?.map((e) => (
                <tr key={e.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-hi">{e.title}</div>
                    <div className="text-xs text-text-low">{formatDate(e.created_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-text-mid">
                    {e.organizer_name}
                    <div className="text-xs text-text-low">{e.organizer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-text-mid">{e.registrations}</td>
                  <td className="px-4 py-3 text-text-mid">{formatMoney(e.revenue, "NGN")}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(e.status)}>{titleCase(e.status)}</Badge></td>
                  <td className="px-4 py-3">
                    {e.status !== "cancelled" && (
                      <button onClick={() => suspend(e.id)} className="text-sm text-red hover:underline cursor-pointer">
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
