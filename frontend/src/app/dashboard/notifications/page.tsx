"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { notificationsApi } from "@/lib/api";
import { cn, formatDateTime } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: notificationsApi.mine });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Reveal className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-text-hi">Notifications</h1>
          <p className="mt-1 text-text-mid">Account, payment, and event updates.</p>
        </div>
        <button onClick={() => markAllRead.mutate()} className="flex items-center gap-1.5 text-sm text-violet hover:underline cursor-pointer">
          <CheckCheck className="size-4" /> Mark all read
        </button>
      </Reveal>

      <div className="mt-6 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : !notifications || notifications.length === 0 ? (
          <EmptyState icon={<Bell className="size-8" />} title="You're all caught up" />
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead.mutate(n.id)}
              className={cn(
                "block w-full rounded-xl border p-4 text-left transition-colors cursor-pointer",
                n.is_read ? "border-line bg-surface" : "border-violet/40 bg-violet/5"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-hi">{n.title}</span>
                {!n.is_read && <span className="size-2 rounded-full bg-pink" />}
              </div>
              <p className="mt-1 text-sm text-text-mid">{n.message}</p>
              <p className="mt-1.5 text-xs text-text-low">{formatDateTime(n.created_at)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
