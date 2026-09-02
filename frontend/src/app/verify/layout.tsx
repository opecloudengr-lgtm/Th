"use client";

import { ScanLine } from "lucide-react";
import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <RequireAuth>
      <div className="min-h-screen bg-ink">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-ink/90 px-5 py-3.5 backdrop-blur">
          <Link href="/verify" className="flex items-center gap-2 font-display text-lg font-semibold text-text-hi">
            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet to-pink">
              <ScanLine className="size-4 text-white" />
            </span>
            Verify
          </Link>
          <button onClick={logout} className="text-sm text-text-mid hover:text-text-hi cursor-pointer">
            Sign out
          </button>
        </header>
        <main className="mx-auto max-w-lg px-5 py-8">{children}</main>
      </div>
    </RequireAuth>
  );
}
