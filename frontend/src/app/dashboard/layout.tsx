"use client";

import { CalendarDays, LayoutGrid, Ticket, User } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/components/RequireAuth";

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/dashboard/tickets", label: "My tickets", icon: Ticket },
  { href: "/dashboard/events", label: "My events", icon: CalendarDays },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell navItems={navItems} portalLabel="Attendee">
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
