"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar, Check, Globe, Lock, MapPin, ShieldCheck, Sparkles, Ticket as TicketIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiException, eventsApi, registrationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { TicketType } from "@/lib/types";
import { formatDate, formatDateTime, formatMoney, titleCase } from "@/lib/utils";

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => eventsApi.get(slug),
  });

  const registerMutation = useMutation({
    mutationFn: (ticketTypeId: string) => registrationsApi.register(event!.id, ticketTypeId),
    onSuccess: (result) => {
      if (result.requires_payment && result.payment_authorization_url) {
        toast.info("Redirecting you to Paystack to complete payment…");
        window.location.href = result.payment_authorization_url;
        return;
      }
      toast.success("You're in! Your ticket is ready.");
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
      router.push(`/dashboard/tickets/${result.registration.ticket?.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiException ? err.message : "Registration failed.");
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-3 h-5 w-1/3" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-24 text-center sm:px-8">
        <h1 className="font-display text-3xl text-text-hi">Event not found</h1>
        <p className="mt-2 text-text-mid">It may be unpublished, private, or the link is incorrect.</p>
        <Link href="/events" className="mt-6 inline-block text-violet underline underline-offset-4">
          Browse other events
        </Link>
      </div>
    );
  }

  const isPrivate = event.registration_mode === "private";
  const canAct = !!user && user.is_email_verified;

  const handleRegister = () => {
    if (!selectedTicketType) return;
    if (!user) {
      toast.message("Log in to register", { description: "Create a free account or log in to grab this ticket." });
      router.push(`/login?next=/events/${slug}`);
      return;
    }
    if (!user.is_email_verified) {
      toast.message("Verify your email first", { description: "Check your inbox for the verification link." });
      return;
    }
    registerMutation.mutate(selectedTicketType.id);
  };

  return (
    <div>
      {/* Cover */}
      <div
        className="relative flex h-[340px] items-end bg-cover bg-center sm:h-[420px]"
        style={
          event.cover_image_url
            ? { backgroundImage: `url(${event.cover_image_url})` }
            : { background: `linear-gradient(135deg, ${event.theme_color}66, #0b0a10 70%)` }
        }
      >
        <div className="bg-dot-grid absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="relative mx-auto w-full max-w-5xl px-5 pb-10 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex flex-wrap gap-2">
              <Badge tone="violet" className="bg-ink/70 backdrop-blur">{titleCase(event.category)}</Badge>
              <Badge tone="neutral" className="bg-ink/70 backdrop-blur">
                {event.event_format === "online" ? <Globe className="size-3" /> : <MapPin className="size-3" />}
                {titleCase(event.event_format)}
              </Badge>
              {isPrivate && (
                <Badge tone="amber" className="bg-ink/70 backdrop-blur">
                  <Lock className="size-3" /> Invite only
                </Badge>
              )}
            </div>
            <h1 className="mt-4 max-w-3xl font-display text-3xl font-medium leading-tight text-text-hi sm:text-5xl">{event.title}</h1>
            <p className="mt-2 text-text-mid">
              Hosted by {event.organizer.first_name} {event.organizer.last_name}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_360px]">
        {/* Main content */}
        <div className="space-y-12">
          <Reveal className="flex flex-wrap gap-6 rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-violet" />
              <div>
                <div className="text-sm font-medium text-text-hi">{formatDate(event.start_at)}</div>
                <div className="text-xs text-text-mid">
                  {formatDateTime(event.start_at).split("·")[1]} – {formatDateTime(event.end_at).split("·")[1]}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {event.event_format === "online" ? <Globe className="size-5 text-violet" /> : <MapPin className="size-5 text-violet" />}
              <div>
                <div className="text-sm font-medium text-text-hi">{event.venue_name || (event.event_format === "online" ? "Online event" : "Venue TBA")}</div>
                <div className="text-xs text-text-mid">{event.city ? `${event.city}, ${event.country}` : event.event_format === "online" ? "Link shared after registration" : ""}</div>
              </div>
            </div>
          </Reveal>

          {event.description && (
            <Reveal>
              <h2 className="font-display text-xl text-text-hi">About this event</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-text-mid">{event.description}</p>
            </Reveal>
          )}

          {event.sections.map((section) => (
            <Reveal key={section.id}>
              <SectionRenderer section={section} />
            </Reveal>
          ))}

          <Reveal className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-5 text-sm text-text-mid">
            <ShieldCheck className="size-5 shrink-0 text-emerald" />
            Every ticket for this event gets a unique, cryptographically secure QR code. Staff verify it against our
            servers at the door — it can never be duplicated or reused.
          </Reveal>
        </div>

        {/* Sidebar - tickets */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Reveal className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="font-display text-lg text-text-hi">Tickets</h3>

            {isPrivate ? (
              <div className="mt-4 rounded-xl border border-dashed border-line p-5 text-center text-sm text-text-mid">
                <Lock className="mx-auto mb-2 size-6 text-amber" />
                This is a private event. You need a personal invitation link from the organizer to register.
              </div>
            ) : event.ticket_types.length === 0 ? (
              <p className="mt-3 text-sm text-text-mid">Ticket sales haven&apos;t opened yet. Check back soon.</p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {event.ticket_types.filter((t) => t.is_active).map((tt) => {
                  const soldOut = tt.capacity !== null && tt.quantity_sold >= tt.capacity;
                  const selected = selectedTicketType?.id === tt.id;
                  return (
                    <button
                      key={tt.id}
                      disabled={soldOut}
                      onClick={() => setSelectedTicketType(tt)}
                      className={`w-full rounded-xl border p-3.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected ? "border-violet bg-violet/10" : "border-line hover:border-violet/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-text-hi">
                          {tt.is_vip && <Sparkles className="size-3.5 text-amber" />}
                          {tt.name}
                        </span>
                        <span className="font-display text-text-hi">{formatMoney(tt.price, event.currency)}</span>
                      </div>
                      {tt.description && <p className="mt-1 text-xs text-text-mid">{tt.description}</p>}
                      <div className="mt-1.5 text-xs text-text-low">
                        {soldOut ? "Sold out" : tt.capacity ? `${tt.capacity - tt.quantity_sold} left` : "Open"}
                      </div>
                    </button>
                  );
                })}

                <Button fullWidth size="lg" className="mt-2" loading={registerMutation.isPending} disabled={!selectedTicketType} onClick={handleRegister}>
                  <TicketIcon className="size-4" />
                  {!user ? "Log in to register" : selectedTicketType && parseFloat(selectedTicketType.price) > 0 ? "Continue to payment" : "Get free ticket"}
                </Button>

                {user && !user.is_email_verified && (
                  <p className="mt-2 text-center text-xs text-amber">Verify your email to register for events.</p>
                )}
              </div>
            )}

            <ul className="mt-6 space-y-2 border-t border-line pt-5 text-xs text-text-mid">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald" /> Instant, secure QR ticket
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald" /> Downloadable PDF ticket
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald" /> Manage from your dashboard
              </li>
            </ul>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function SectionRenderer({ section }: { section: { section_type: string; content: Record<string, unknown> } }) {
  const content = section.content;
  const title = titleCase(section.section_type);

  if (section.section_type === "faq" && Array.isArray(content.items)) {
    return (
      <div>
        <h2 className="font-display text-xl text-text-hi">FAQ</h2>
        <div className="mt-4 space-y-3">
          {(content.items as { q: string; a: string }[]).map((item, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-4">
              <p className="font-medium text-text-hi">{item.q}</p>
              <p className="mt-1 text-sm text-text-mid">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (typeof content.body === "string") {
    return (
      <div>
        <h2 className="font-display text-xl text-text-hi">{title}</h2>
        <p className="mt-3 whitespace-pre-line leading-relaxed text-text-mid">{content.body}</p>
      </div>
    );
  }

  return null;
}
