"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

/** Full-screen view of an image -- click the backdrop, press Escape, or hit
 * the close button to dismiss. Used for cover images so visitors can see
 * an organizer's uploaded design at full size instead of the cropped
 * banner crop. */
export function Lightbox({ src, open, onClose }: { src: string | null; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/92 p-6 backdrop-blur-sm cursor-zoom-out"
        >
          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-full bg-surface-raised text-text-hi hover:bg-red cursor-pointer"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          <motion.img
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            src={src}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl cursor-default"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
