"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, LayoutDashboard, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NexoraMark } from "@/components/NexoraMark";
import { notificationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn, initials } from "@/lib/utils";
import { SlideMenu } from "./SlideMenu";

const links = [{ href: "/events", label: "Explore Events" }];

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const { data: unread } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const dashboardHref = user?.role === "admin" ? "/admin" : user?.role === "organizer" ? "/organizer" : "/dashboard";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-lg">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-text-hi">
            <NexoraMark size={32} />
            Nexora
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative text-sm font-medium text-text-mid transition-colors hover:text-text-hi",
                  pathname.startsWith(l.href) && "text-text-hi"
                )}
              >
                {l.label}
                {pathname.startsWith(l.href) && (
                  <motion.span layoutId="nav-underline" className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-gradient-to-r from-violet to-pink" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!loading && user && (
              <Link
                href="/profile"
                className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink text-xs font-semibold text-white"
                aria-label="Your profile"
                title={`${user.first_name} ${user.last_name}`}
              >
                {initials(user.first_name, user.last_name)}
                {!!unread?.count && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-pink ring-2 ring-ink" />}
              </Link>
            )}
            {!loading && !user && (
              <div className="hidden items-center gap-3 md:flex">
                <Link href="/login" className="text-sm font-medium text-text-mid hover:text-text-hi">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-gradient-to-r from-violet to-pink px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)] hover:brightness-110"
                >
                  Get started
                </Link>
              </div>
            )}
            <button className="p-2 text-text-hi cursor-pointer" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="size-6" />
            </button>
          </div>
        </nav>
      </header>

      <SlideMenu open={open} onClose={() => setOpen(false)}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-text-hi hover:bg-surface">
            {l.label}
          </Link>
        ))}

        {user ? (
          <>
            <Link href={dashboardHref} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-text-hi hover:bg-surface">
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
            <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-text-hi hover:bg-surface">
              <Bell className="size-4" /> Notifications
              {!!unread?.count && <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-pink text-[11px] font-semibold text-white">{unread.count}</span>}
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
          </>
        ) : (
          <>
            <Link href="/login" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-text-hi hover:bg-surface">
              Log in
            </Link>
            <Link href="/register" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-text-hi hover:bg-surface">
              Get started
            </Link>
          </>
        )}
      </SlideMenu>
    </>
  );
}
