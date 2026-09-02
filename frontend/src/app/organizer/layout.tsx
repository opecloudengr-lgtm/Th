"use client";

import { CalendarDays, LayoutGrid, PlusCircle } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/components/RequireAuth";

const navItems: NavItem[] = [
  { href: "/organizer", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/organizer/events", label: "My events", icon: CalendarDays },
  { href: "/organizer/events/new", label: "Create event", icon: PlusCircle },
];

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={["organizer", "admin"]}>
      <DashboardShell navItems={navItems} portalLabel="Organizer">
        {children}
      </DashboardShell>
    </RequireAuth>
  );
}
