"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NexoraMark } from "@/components/NexoraMark";
import { useAuth } from "@/lib/auth-context";
import { cn, initials } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export function DashboardShell({
  children,
  navItems,
  portalLabel,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  portalLabel: string;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: unread } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
  });

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  const SidebarContent = (
    <>
      <Link href="/" className="flex items-center gap-2 px-1 font-display text-lg font-semibold text-text-hi">
        <NexoraMark size={32} />
        Nexora
      </Link>
      <div className="mt-1 px-1 text-xs font-medium uppercase tracking-widest text-text-low">{portalLabel}</div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-surface-raised text-text-hi" : "text-text-mid hover:bg-surface-raised/60 hover:text-text-hi"
              )}
            >
              {active && <motion.span layoutId="dash-active" className="absolute inset-0 rounded-xl border border-violet/40" />}
              <item.icon className="size-4.5 relative" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-line pt-4">
        <Link href="/dashboard/notifications" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-mid hover:bg-surface-raised/60 hover:text-text-hi">
          <Bell className="size-4.5" />
          Notifications
          {!!unread?.count && <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-pink text-[10px] font-semibold text-white">{unread.count}</span>}
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red hover:bg-surface-raised/60 cursor-pointer">
          <LogOut className="size-4.5" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line/70 bg-ink-soft p-5 lg:flex">{SidebarContent}</aside>

      {/* Mobile topbar + drawer */}
      <div className="flex-1">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-ink/90 px-5 py-3.5 backdrop-blur lg:hidden">
          <span className="flex items-center gap-2 font-display text-lg text-text-hi">
            <NexoraMark size={28} /> Nexora
          </span>
          <button onClick={() => setMobileOpen(true)} className="p-1.5 text-text-hi cursor-pointer">
            <Menu className="size-6" />
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-ink/80 backdrop-blur-sm lg:hidden" />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-ink-soft p-5 lg:hidden"
              >
                <button onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 p-1.5 text-text-mid cursor-pointer">
                  <X className="size-5" />
                </button>
                {SidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <header className="hidden items-center justify-end gap-4 border-b border-line/70 px-8 py-4 lg:flex">
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink text-xs font-semibold text-white">
                {initials(user.first_name, user.last_name)}
              </span>
              <span className="text-sm font-medium text-text-hi">{user.first_name} {user.last_name}</span>
            </div>
          )}
        </header>

        <main className="p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
