"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { ApiException, eventsApi } from "@/lib/api";
import type { EventDetail, TicketType } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export function TicketsTab({ event, onChange }: { event: EventDetail; onChange: () => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TicketType | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (tt: TicketType) => {
    setEditing(tt);
    setModalOpen(true);
  };

  const remove = async (tt: TicketType) => {
    if (!confirm(`Remove "${tt.name}"?`)) return;
    try {
      await eventsApi.removeTicketType(tt.id);
      toast.success("Ticket type removed.");
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not remove ticket type.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-text-hi">Ticket types</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> Add ticket type
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {event.ticket_types.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-text-mid">
            No ticket types yet. Add at least one before publishing.
          </p>
        ) : (
          event.ticket_types.map((tt) => (
            <div key={tt.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5">
              <div>
                <div className="flex items-center gap-1.5 font-medium text-text-hi">
                  {tt.is_vip && <Sparkles className="size-3.5 text-amber" />}
                  {tt.name}
                  {!tt.is_active && <span className="text-xs text-text-low">(inactive)</span>}
                </div>
                <div className="mt-1 text-sm text-text-mid">
                  {formatMoney(tt.price, event.currency)} · {tt.quantity_sold} sold{tt.capacity ? ` / ${tt.capacity}` : " · unlimited"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(tt)} className="text-sm text-violet hover:underline cursor-pointer">
                  Edit
                </button>
                <button onClick={() => remove(tt)} className="text-text-low hover:text-red cursor-pointer">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <TicketTypeModal open={modalOpen} onClose={() => setModalOpen(false)} eventId={event.id} ticketType={editing} onSaved={onChange} />
    </div>
  );
}

function TicketTypeModal({
  open,
  onClose,
  eventId,
  ticketType,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  ticketType: TicketType | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(ticketType?.name ?? "");
  const [description, setDescription] = useState(ticketType?.description ?? "");
  const [price, setPrice] = useState(ticketType?.price ?? "0");
  const [capacity, setCapacity] = useState(ticketType?.capacity?.toString() ?? "");
  const [isVip, setIsVip] = useState(ticketType?.is_vip ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || null,
        price,
        capacity: capacity ? parseInt(capacity, 10) : null,
        is_vip: isVip,
      };
      if (ticketType) await eventsApi.updateTicketType(ticketType.id, payload);
      else await eventsApi.addTicketType(eventId, payload);
      toast.success("Ticket type saved.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not save ticket type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal key={ticketType?.id ?? "new"} open={open} onClose={onClose} title={ticketType ? "Edit ticket type" : "New ticket type"}>
      <div className="space-y-4">
        <div>
          <Label required>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard, VIP, Early Bird" />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>Price</Label>
            <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input type="number" min={1} placeholder="Unlimited" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-hi">
          <input type="checkbox" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} className="accent-violet" />
          Mark as VIP ticket type
        </label>
        <Button fullWidth loading={saving} onClick={save}>
          Save ticket type
        </Button>
      </div>
    </Modal>
  );
}
