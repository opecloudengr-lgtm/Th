"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { NexoraMark } from "@/components/NexoraMark";

export function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden px-5 py-16">
      <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_30%,#000_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 size-[500px] -translate-x-1/2 rounded-full bg-violet/15 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-[26px] border border-line bg-surface p-8 shadow-2xl sm:p-10"
      >
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-text-hi">
          <NexoraMark size={32} />
          Nexora
        </Link>
        <h1 className="mt-6 font-display text-2xl font-medium text-text-hi">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-text-mid">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </motion.div>
    </div>
  );
}
