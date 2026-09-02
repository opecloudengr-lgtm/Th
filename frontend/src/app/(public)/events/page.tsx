"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { EventCard } from "@/components/EventCard";
import { Reveal } from "@/components/motion/Reveal";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { eventsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const categories = [
  "conference", "seminar", "workshop", "webinar", "training", "masterclass", "summit", "networking",
  "wedding", "birthday", "graduation", "anniversary", "party", "church_event", "other",
];

export default function EventsPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState("");
  const [isFree, setIsFree] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["events", { q, category, format, isFree, page }],
    queryFn: () =>
      eventsApi.list({
        q: q || undefined,
        category: category || undefined,
        event_format: format || undefined,
        is_free: isFree === "" ? undefined : isFree === "free",
        page,
        page_size: 9,
      }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const hasFilters = q || category || format || isFree;

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <Reveal>
        <span className="text-xs font-semibold uppercase tracking-widest text-violet">Discover</span>
        <h1 className="mt-2 font-display text-4xl font-medium text-text-hi">Browse public events</h1>
        <p className="mt-2 max-w-xl text-text-mid">Search across every published event on EventPass — filter by category, format, and price.</p>
      </Reveal>

      <Reveal delay={0.05} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-low" />
          <Input
            placeholder="Search events, cities, keywords…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            className="pl-10"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-text-hi hover:border-violet/50 cursor-pointer",
            filtersOpen && "border-violet text-violet"
          )}
        >
          <SlidersHorizontal className="size-4" /> Filters
        </button>
      </Reveal>

      {filtersOpen && (
        <Reveal delay={0} className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3">
          <div>
            <Select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Select value={format} onChange={(e) => { setPage(1); setFormat(e.target.value); }}>
              <option value="">Any format</option>
              <option value="physical">In-person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </Select>
          </div>
          <div>
            <Select value={isFree} onChange={(e) => { setPage(1); setIsFree(e.target.value); }}>
              <option value="">Free & paid</option>
              <option value="free">Free only</option>
              <option value="paid">Paid only</option>
            </Select>
          </div>
        </Reveal>
      )}

      {hasFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-mid">
          Active filters:
          {[q && ["Search", q, () => setQ("")], category && ["Category", category, () => setCategory("")], format && ["Format", format, () => setFormat("")], isFree && ["Price", isFree, () => setIsFree("")]]
            .filter(Boolean)
            .map((f) => {
              const [label, value, clear] = f as [string, string, () => void];
              return (
                <button key={label} onClick={clear} className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 hover:border-red hover:text-red cursor-pointer">
                  {label}: {value} <X className="size-3" />
                </button>
              );
            })}
        </div>
      )}

      <div className="mt-10">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn(
                      "size-9 rounded-full text-sm font-medium cursor-pointer",
                      page === i + 1 ? "bg-gradient-to-r from-violet to-pink text-white" : "text-text-mid hover:bg-surface"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState title="No events match your filters" description="Try clearing a filter, or check back soon — new events are added all the time." />
        )}
      </div>
    </div>
  );
}
