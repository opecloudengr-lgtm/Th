"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Armchair, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/Skeleton";
import { ApiException, organizerApi, seatingApi } from "@/lib/api";
import type { EventDetail, Seat } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SeatingTab({ event }: { event: EventDetail }) {
  const queryClient = useQueryClient();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [assignSeat, setAssignSeat] = useState<Seat | null>(null);

  const { data: seats, isLoading } = useQuery({ queryKey: ["seats", event.id], queryFn: () => seatingApi.list(event.id) });

  const grouped = (seats ?? []).reduce<Record<string, Seat[]>>((acc, s) => {
    (acc[s.section] ??= []).push(s);
    return acc;
  }, {});
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => a.row_label.localeCompare(b.row_label) || parseInt(a.number, 10) - parseInt(b.number, 10));
  }

  const release = async (seat: Seat) => {
    try {
      await seatingApi.release(seat.id);
      queryClient.invalidateQueries({ queryKey: ["seats", event.id] });
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not release seat.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-text-hi">Seating</h3>
        <Button size="sm" onClick={() => setBulkOpen(true)}>
          <Plus className="size-4" /> Add seats
        </Button>
      </div>

      {!isLoading && (!seats || seats.length === 0) ? (
        <EmptyState icon={<Armchair className="size-8" />} title="No seats yet" description="Create seat sections and rows to assign VIP and reserved seating." className="mt-5" />
      ) : (
        <div className="mt-5 space-y-6">
          {Object.entries(grouped).map(([section, list]) => (
            <div key={section}>
              <h4 className="mb-2 text-sm font-semibold text-text-mid">{section}</h4>
              <div className="flex flex-wrap gap-2">
                {list.map((seat) => (
                  <button
                    key={seat.id}
                    onClick={() => (seat.status === "assigned" ? release(seat) : setAssignSeat(seat))}
                    title={seat.status === "assigned" ? "Click to release" : "Click to assign"}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-lg border text-xs font-medium cursor-pointer",
                      seat.status === "assigned" ? "border-violet bg-violet/20 text-violet" : "border-line text-text-mid hover:border-violet/50"
                    )}
                  >
                    {seat.row_label}{seat.number}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <BulkSeatModal open={bulkOpen} onClose={() => setBulkOpen(false)} eventId={event.id} />
      <AssignSeatModal seat={assignSeat} onClose={() => setAssignSeat(null)} eventId={event.id} />
    </div>
  );
}

function BulkSeatModal({ open, onClose, eventId }: { open: boolean; onClose: () => void; eventId: string }) {
  const queryClient = useQueryClient();
  const [section, setSection] = useState("Front Row");
  const [rows, setRows] = useState("A,B,C");
  const [perRow, setPerRow] = useState("10");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setSaving(true);
    try {
      await seatingApi.bulkCreate(eventId, section, rows.split(",").map((r) => r.trim()).filter(Boolean), parseInt(perRow, 10));
      toast.success("Seats created.");
      queryClient.invalidateQueries({ queryKey: ["seats", eventId] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not create seats.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add seats">
      <div className="space-y-4">
        <div>
          <Label required>Section name</Label>
          <Input value={section} onChange={(e) => setSection(e.target.value)} />
        </div>
        <div>
          <Label required>Row labels (comma-separated)</Label>
          <Input value={rows} onChange={(e) => setRows(e.target.value)} placeholder="A,B,C" />
        </div>
        <div>
          <Label required>Seats per row</Label>
          <Input type="number" min={1} value={perRow} onChange={(e) => setPerRow(e.target.value)} />
        </div>
        <Button fullWidth loading={saving} onClick={create}>
          Create seats
        </Button>
      </div>
    </Modal>
  );
}

function AssignSeatModal({ seat, onClose, eventId }: { seat: Seat | null; onClose: () => void; eventId: string }) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["participants-for-seat", eventId, q],
    queryFn: () => organizerApi.participants(eventId, { q, checked_in: "false" }),
    enabled: !!seat,
  });

  const assign = async (ticketId: string) => {
    if (!seat) return;
    setSaving(true);
    try {
      await seatingApi.assign(seat.id, ticketId);
      toast.success(`Seat ${seat.label} assigned.`);
      queryClient.invalidateQueries({ queryKey: ["seats", eventId] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not assign seat.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!seat} onClose={onClose} title={seat ? `Assign seat ${seat.label}` : ""}>
      <Input placeholder="Search attendee name, email, or ticket code…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
        {data?.items.filter((p) => p.ticket_id).map((p) => (
          <button
            key={p.registration_id}
            disabled={saving}
            onClick={() => assign(p.ticket_id!)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface cursor-pointer disabled:opacity-50"
          >
            <span className="text-text-hi">{p.full_name}</span>
            <span className="font-mono text-xs text-text-low">{p.ticket_code}</span>
          </button>
        ))}
        {data && data.items.length === 0 && <p className="p-3 text-sm text-text-mid">No matching attendees.</p>}
      </div>
    </Modal>
  );
}
