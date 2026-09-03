"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  QrCode,
  Sparkles,
  Ticket as TicketIcon,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/motion/Reveal";
import { eventsApi } from "@/lib/api";

const steps = [
  { icon: Users, title: "Register & verify", body: "Create an account, confirm your email, and you're ready to book or build." },
  { icon: CalendarCheck, title: "Discover or design", body: "Browse public events, or build your own with a no-code editor — free or paid, public or invite-only." },
  { icon: Wallet, title: "Pay securely", body: "Paystack handles the money. We never trust the frontend alone — every payment is verified server-side." },
  { icon: QrCode, title: "Scan & check in", body: "Every ticket gets a unique, tamper-proof QR code. Staff scan at the door for instant, atomic check-in." },
];

const categories = [
  "Conferences", "Weddings", "Workshops", "Summits", "Webinars", "Birthdays", "Church Events", "Networking",
];

export default function HomePage() {
  const { data } = useQuery({
    queryKey: ["home-events"],
    queryFn: () => eventsApi.list({ page_size: 6 }),
  });

  return (
    <div className="relative overflow-hidden">
      <HeroSection />

      {/* Upcoming events */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-violet">Happening soon</span>
              <h2 className="mt-2 font-display text-3xl font-medium text-text-hi sm:text-4xl">Live on Nexora right now</h2>
            </div>
            <Link href="/events" className="flex items-center gap-1 text-sm font-medium text-text-mid hover:text-violet">
              See all events <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>

        {data && data.items.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        ) : (
          <Reveal delay={0.1} className="mt-10 rounded-2xl border border-dashed border-line py-16 text-center text-text-mid">
            No public events yet — be the first to{" "}
            <Link href="/register" className="text-violet underline underline-offset-4">
              publish one
            </Link>
            .
          </Reveal>
        )}
      </section>

      {/* How it works */}
      <section className="border-y border-line/70 bg-ink-soft py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet">The flow</span>
            <h2 className="mt-2 font-display text-3xl font-medium text-text-hi sm:text-4xl">
              From registration to a checked-in guest, in four real steps.
            </h2>
          </Reveal>

          <StaggerGroup className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <StaggerItem key={step.title}>
                <div className="relative h-full rounded-2xl border border-line bg-surface p-6">
                  <span className="font-display text-4xl text-line">{String(i + 1).padStart(2, "0")}</span>
                  <step.icon className="mt-3 size-6 text-violet" />
                  <h3 className="mt-4 font-display text-lg text-text-hi">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-mid">{step.body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Reveal className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet">Any occasion</span>
          <h2 className="mx-auto mt-2 max-w-2xl font-display text-3xl font-medium text-text-hi sm:text-4xl">
            Corporate conferences. Elegant celebrations. Same secure ticket.
          </h2>
        </Reveal>

        <StaggerGroup className="mt-10 flex flex-wrap justify-center gap-3">
          {categories.map((c) => (
            <StaggerItem key={c}>
              <span className="inline-block rounded-full border border-line bg-surface px-5 py-2.5 text-sm text-text-mid transition-colors hover:border-violet hover:text-violet">
                {c}
              </span>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* Organizer CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-[28px] border border-violet/30 bg-gradient-to-br from-[#241b3a] via-[#1a1725] to-[#2a1830] p-10 sm:p-16">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-pink/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-violet/25 blur-3xl" />
            <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/40 bg-violet/10 px-3 py-1 text-xs font-medium text-violet">
                  <Sparkles className="size-3.5" /> For organizers
                </span>
                <h2 className="mt-4 font-display text-3xl font-medium text-text-hi sm:text-4xl">
                  Design, sell, and guard the door — from one dashboard.
                </h2>
                <p className="mt-3 text-text-mid">
                  Reserved seating, VIP tiers, staff scanners, live payment tracking, and CSV/Excel/PDF exports.
                  Free events cost nothing to run.
                </p>
              </div>
              <Link
                href="/register"
                className="group flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-violet to-pink px-7 py-3.5 font-medium text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)] hover:brightness-110"
              >
                Create your first event
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative border-b border-line/70">
      <div className="bg-dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-violet/20 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:py-32">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-text-mid"
          >
            <TicketIcon className="size-3.5 text-violet" /> Secure, single-use QR tickets
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 font-display text-5xl font-medium leading-[1.05] tracking-tight text-text-hi sm:text-6xl"
          >
            Every event deserves a <span className="text-gradient italic">proper</span> door.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
            className="mt-6 max-w-lg text-lg leading-relaxed text-text-mid"
          >
            Nexora handles registration, Paystack payments, VIP seating and entrance scanning —
            so your conference, wedding, or workshop runs on real infrastructure, not spreadsheets.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/events"
              className="rounded-full bg-gradient-to-r from-violet to-pink px-7 py-3.5 font-medium text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)] hover:brightness-110"
            >
              Browse events
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-line px-7 py-3.5 font-medium text-text-hi hover:border-violet hover:text-violet"
            >
              Create an event
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-14 flex gap-10"
          >
            {[
              ["Server-verified", "Every payment"],
              ["Atomic", "Check-in, always"],
              ["Zero", "Predictable ticket IDs"],
            ].map(([a, b]) => (
              <div key={a}>
                <div className="font-display text-2xl text-text-hi">{a}</div>
                <div className="text-xs text-text-low">{b}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <TicketStack />
      </div>
    </section>
  );
}

function TicketStack() {
  const tickets = [
    { rotate: -8, top: 30, left: 10, color: "#8b5cf6", label: "VIP ACCESS", name: "Ada Lovelace" },
    { rotate: 4, top: 0, left: 60, color: "#f472b6", label: "STANDARD", name: "Femi Ade" },
    { rotate: -3, top: 130, left: 40, color: "#f5a623", label: "SPEAKER", name: "Ngozi Eze" },
  ];

  return (
    <div className="relative hidden h-[420px] lg:block">
      {tickets.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 40, rotate: t.rotate - 6 }}
          animate={{ opacity: 1, y: 0, rotate: t.rotate }}
          transition={{ duration: 0.7, delay: 0.3 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="animate-float-slow absolute w-72"
          style={{ top: t.top, left: t.left, animationDelay: `${i * 0.6}s` }}
        >
          <div className="ticket-stub glow-violet flex items-center overflow-hidden border border-line bg-surface-raised">
            <div className="flex h-28 w-8 flex-col items-center justify-center gap-1" style={{ background: t.color }} />
            <div className="ticket-perf h-28" />
            <div className="flex-1 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-low">Nexora</div>
              <div className="mt-1 font-display text-base text-text-hi">{t.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: t.color }}>
                  {t.label}
                </span>
                <span className="font-mono text-[10px] text-text-low">EVT-{i}A2F9K</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
