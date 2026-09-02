"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseFieldClasses =
  "w-full rounded-xl bg-surface border border-line px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low outline-none transition-colors focus:border-violet focus:ring-2 focus:ring-violet/20";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <input ref={ref} className={cn(baseFieldClasses, error && "border-red focus:border-red focus:ring-red/20", className)} {...props} />
    {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
  </div>
));
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <textarea ref={ref} className={cn(baseFieldClasses, "min-h-28 resize-y", error && "border-red", className)} {...props} />
    {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
  </div>
));
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, error, children, ...props }, ref) => (
  <div className="w-full">
    <select ref={ref} className={cn(baseFieldClasses, "appearance-none cursor-pointer", error && "border-red", className)} {...props}>
      {children}
    </select>
  </div>
));
Select.displayName = "Select";

export function Label({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-mid">
      {children}
      {required && <span className="text-pink"> *</span>}
    </label>
  );
}
