"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { NexoraMark } from "@/components/NexoraMark";

/** A small panel anchored to the right edge of the screen -- not a
 * full-screen takeover -- opened from a hamburger button. Shared by the
 * public Navbar and AccountLayout so both get the same menu behavior. */
export function SlideMenu({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col border-l border-line bg-ink-soft p-5 sm:max-w-[300px]"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-display text-lg text-text-hi">
                <NexoraMark size={28} /> Nexora
              </span>
              <button onClick={onClose} className="p-1.5 text-text-hi cursor-pointer" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-6 flex flex-1 flex-col gap-1">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
