"use client";

import { ArrowLeft, Bell, LayoutDashboard, LogOut, Menu, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NexoraMark } from "@/components/NexoraMark";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { SlideMenu } from "./SlideMenu";

/** Account-level pages (profile, notifications) are the same for every
 * role -- unlike /admin, /organizer, and /dashboard, which are separate
 * portals with role-specific navigation, there's exactly one of these, and
 * every authenticated user (regardless of role) lands on the same page. */
export function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dashboardHref = user?.role === "admin" ? "/admin" : user?.role === "organizer" ? "/organizer" : "/dashboard";

  return (
    <RequireAuth>
      <div className="min-h-screen bg-ink">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-ink/90 px-5 py-3.5 backdrop-blur sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-text-hi">
            <NexoraMark size={28} />
            Nexora
          </Link>
          <div className="flex items-center gap-4">
            <Link href={dashboardHref} className="flex items-center gap-1.5 text-sm font-medium text-text-mid hover:text-text-hi">
              <ArrowLeft className="size-4" /> Dashboard
            </Link>
            <button className="p-1.5 text-text-hi cursor-pointer" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">{children}</main>
      </div>

      <SlideMenu open={open} onClose={() => setOpen(false)}>
        <Link href={dashboardHref} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-text-hi hover:bg-surface">
          <LayoutDashboard className="size-4" /> Dashboard
        </Link>
        <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-text-hi hover:bg-surface">
          <UserIcon className="size-4" /> Profile
        </Link>
        <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-text-hi hover:bg-surface">
          <Bell className="size-4" /> Notifications
        </Link>
        <button
          onClick={() => {
            setOpen(false);
            logout();
          }}
          className="mt-auto flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red hover:bg-surface cursor-pointer"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </SlideMenu>
    </RequireAuth>
  );
}
