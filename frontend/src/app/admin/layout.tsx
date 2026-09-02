"use client";

import { CreditCard, LayoutGrid, Ticket, Users } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/components/RequireAuth";

const navItems: NavItem[] = [
  { href: "/admin", label: "Reports", icon: LayoutGrid, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/events", label: "Events", icon: Ticket },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={["admin"]}>
      <DashboardShell navItems={navItems} portalLabel="Admin">
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
