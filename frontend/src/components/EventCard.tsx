"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Radio } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { EventListItem } from "@/lib/types";
import { formatDate, formatMoney, titleCase } from "@/lib/utils";

export function EventCard({ event, index = 0 }: { event: EventListItem; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8 }}
    >
      <Link href={`/events/${event.slug}`} className="group block overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-violet/50">
        <div
          className="relative flex h-40 items-end overflow-hidden bg-cover bg-center p-4"
          style={
            event.cover_image_url
              ? { backgroundImage: `url(${event.cover_image_url})` }
              : { background: `linear-gradient(135deg, ${event.theme_color}55, #0b0a10)` }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
          <div className="relative flex flex-wrap gap-1.5">
            <Badge tone="neutral" className="bg-ink/60 backdrop-blur">
              {titleCase(event.category)}
            </Badge>
            {event.event_format === "online" && (
              <Badge tone="violet" className="bg-ink/60 backdrop-blur">
                <Radio className="size-3" /> Online
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-display text-lg font-medium leading-snug text-text-hi transition-colors group-hover:text-violet">
            {event.title}
          </h3>
          <div className="mt-3 space-y-1.5 text-sm text-text-mid">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" />
              {formatDate(event.start_at)}
            </div>
            {event.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {event.city}
                {event.country ? `, ${event.country}` : ""}
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="font-display text-base font-medium text-text-hi">
              {event.is_free ? "Free" : formatMoney(event.min_price ?? 0, event.currency)}
            </span>
            <span className="text-xs font-medium text-violet opacity-0 transition-opacity group-hover:opacity-100">View event →</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
