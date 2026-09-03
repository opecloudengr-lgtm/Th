"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { ApiException, staffApi } from "@/lib/api";
import type { EventDetail } from "@/lib/types";
import { initials } from "@/lib/utils";

export function StaffTab({ event }: { event: EventDetail }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const { data: staff, isLoading } = useQuery({ queryKey: ["staff", event.id], queryFn: () => staffApi.list(event.id) });

  const invite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await staffApi.invite(event.id, email.trim());
      toast.success("Staff member added.");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["staff", event.id] });
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not invite staff.");
    } finally {
      setInviting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await staffApi.remove(id);
      queryClient.invalidateQueries({ queryKey: ["staff", event.id] });
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not remove staff.");
    }
  };

  return (
    <div>
      <h3 className="font-display text-lg text-text-hi">Verification staff</h3>
      <p className="mt-1 text-sm text-text-mid">
        Add anyone with a Nexora account to scan and check in tickets for this event.
      </p>

      <div className="mt-4 flex gap-2">
        <Input placeholder="staff@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} />
        <Button onClick={invite} loading={inviting}>
          <UserPlus className="size-4" /> Add
        </Button>
      </div>

      <div className="mt-6 space-y-2.5">
        {isLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : !staff || staff.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="size-8" />} title="No staff added yet" description="Only the organizer can verify tickets until you add staff." />
        ) : (
          staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink text-xs font-semibold text-white">
                  {initials(s.user.first_name, s.user.last_name)}
                </span>
                <div>
                  <div className="text-sm font-medium text-text-hi">{s.user.first_name} {s.user.last_name}</div>
                  <div className="text-xs text-text-low">{s.user.email}</div>
                </div>
              </div>
              <button onClick={() => remove(s.id)} className="text-text-low hover:text-red cursor-pointer">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
