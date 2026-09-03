import Link from "next/link";
import { NexoraMark } from "@/components/NexoraMark";

export function Footer() {
  return (
    <footer className="border-t border-line/70 bg-ink-soft">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold text-text-hi">
              <NexoraMark size={32} />
              Nexora
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-text-mid">
              Registration, ticketing and entrance verification for conferences, weddings, and everything in between.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-low">Platform</h4>
              <ul className="space-y-2 text-sm text-text-mid">
                <li><Link href="/events" className="hover:text-text-hi">Browse events</Link></li>
                <li><Link href="/register" className="hover:text-text-hi">Create an event</Link></li>
                <li><Link href="/verify" className="hover:text-text-hi">Staff check-in</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-low">Account</h4>
              <ul className="space-y-2 text-sm text-text-mid">
                <li><Link href="/login" className="hover:text-text-hi">Log in</Link></li>
                <li><Link href="/register" className="hover:text-text-hi">Sign up</Link></li>
                <li><Link href="/forgot-password" className="hover:text-text-hi">Reset password</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-line/70 pt-6 text-xs text-text-low">
          © {new Date().getFullYear()} Nexora. Built for real events, real tickets.
        </div>
      </div>
    </footer>
  );
}
