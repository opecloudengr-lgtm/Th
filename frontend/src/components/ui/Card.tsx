"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div className={cn("rounded-2xl border border-line bg-surface p-6", className)} {...props}>
      {children}
    </motion.div>
  );
}

export function HoverCard({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn("rounded-2xl border border-line bg-surface transition-colors hover:border-violet/50", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
