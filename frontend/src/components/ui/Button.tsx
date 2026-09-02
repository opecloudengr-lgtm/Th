"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-violet to-pink text-white shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)] hover:brightness-110",
  secondary: "bg-surface-raised text-text-hi border border-line hover:border-violet/50",
  ghost: "bg-transparent text-text-hi hover:bg-surface-raised",
  outline: "bg-transparent border border-line text-text-hi hover:border-violet hover:text-violet",
  danger: "bg-red text-white hover:brightness-110",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-sm rounded-full",
  md: "px-5 py-2.5 text-sm rounded-full",
  lg: "px-7 py-3.5 text-base rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        transition={{ duration: 0.15 }}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
