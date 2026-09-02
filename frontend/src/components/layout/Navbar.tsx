"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, LogOut, Menu, Ticket, User as UserIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn, initials } from "@/lib/utils";

const links = [
  { href: "/events", label: "Explore Events" },
];

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const dashboardHref = user?.role === "admin" ? "/admin" : user?.role === "organizer" ? "/organizer" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-text-hi">
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink">
            <Ticket className="size-4 text-white" />
          </span>
          EventPass
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

        <div className="hidden items-center gap-3 md:flex">
          {loading ? null : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1.5 pr-3.5 text-sm text-text-hi hover:border-violet/50 cursor-pointer"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink text-xs font-semibold text-white">
                  {initials(user.first_name, user.last_name)}
                </span>
                {user.first_name}
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface-raised p-1.5 shadow-2xl"
                  >
                    <Link onClick={() => setMenuOpen(false)} href={dashboardHref} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-hi hover:bg-surface">
                      <LayoutDashboard className="size-4" /> Dashboard
                    </Link>
                    {user.role === "attendee" && (
                      <Link onClick={() => setMenuOpen(false)} href="/dashboard/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-hi hover:bg-surface">
                        <UserIcon className="size-4" /> Profile
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red hover:bg-surface cursor-pointer"
                    >
                      <LogOut className="size-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-text-mid hover:text-text-hi">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-violet to-pink px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)] hover:brightness-110"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button className="p-2 text-text-hi md:hidden cursor-pointer" onClick={() => setOpen(true)}>
          <Menu className="size-6" />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/95 backdrop-blur-lg md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <span className="font-display text-xl text-text-hi">EventPass</span>
              <button onClick={() => setOpen(false)} className="p-2 text-text-hi cursor-pointer">
                <X className="size-6" />
              </button>
            </div>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              className="flex flex-col gap-1 px-5 py-4"
            >
              {[...links, { href: "/login", label: "Log in" }, { href: "/register", label: "Get started" }].map((l) => (
                <motion.div key={l.href} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-3 text-lg font-medium text-text-hi hover:bg-surface"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              {user && (
                <motion.div variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                  <Link href={dashboardHref} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-lg font-medium text-text-hi hover:bg-surface">
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="block w-full rounded-xl px-3 py-3 text-left text-lg font-medium text-red hover:bg-surface cursor-pointer"
                  >
                    Sign out
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
