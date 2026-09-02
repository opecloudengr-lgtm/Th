"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiException, adminApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", q, role],
    queryFn: () => adminApi.users({ ...(q ? { q } : {}), ...(role ? { role } : {}), page_size: "100" }),
  });

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await adminApi.updateUser(id, { is_active: !isActive });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(!isActive ? "User reactivated." : "User deactivated.");
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not update user.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl text-text-hi">Users</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-low" />
          <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-48">
          <option value="">All roles</option>
          <option value="attendee">Attendee</option>
          <option value="organizer">Organizer</option>
          <option value="admin">Admin</option>
        </Select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-low">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Verified</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-hi">{u.first_name} {u.last_name}</div>
                    <div className="text-xs text-text-low">{u.email}</div>
                  </td>
                  <td className="px-4 py-3"><Badge tone="violet">{u.role}</Badge></td>
                  <td className="px-4 py-3">{u.is_email_verified ? <Badge tone="emerald">Yes</Badge> : <Badge tone="amber">No</Badge>}</td>
                  <td className="px-4 py-3 text-text-mid">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">{u.is_active ? <Badge tone="emerald">Active</Badge> : <Badge tone="red">Deactivated</Badge>}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u.id, u.is_active)} className="text-sm text-violet hover:underline cursor-pointer">
                      {u.is_active ? "Deactivate" : "Reactivate"}
                    </button>
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
