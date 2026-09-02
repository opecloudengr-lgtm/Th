"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Plus, Sparkles, Trash2 } from "lucide-react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { ApiException, invitationsApi } from "@/lib/api";
import type { EventDetail, VipLevel } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const vipLevels: VipLevel[] = ["regular", "vip", "vvip", "chairman", "special_guest", "speaker", "host", "staff", "media"];

export function InvitationsTab({ event }: { event: EventDetail }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: invitations, isLoading } = useQuery({ queryKey: ["invitations", event.id], queryFn: () => invitationsApi.list(event.id) });

  const send = async (id: string) => {
    try {
      await invitationsApi.send(id);
      toast.success("Invitation sent.");
      queryClient.invalidateQueries({ queryKey: ["invitations", event.id] });
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not send invitation.");
    }
  };

  const remove = async (id: string) => {
    try {
      await invitationsApi.remove(id);
      queryClient.invalidateQueries({ queryKey: ["invitations", event.id] });
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not remove invitation.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-text-hi">Guest invitations</h3>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="size-4" /> Add guest
        </Button>
      </div>

      <div className="mt-5 space-y-2.5">
        {isLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : !invitations || invitations.length === 0 ? (
          <EmptyState icon={<Mail className="size-8" />} title="No guests invited yet" description="Add guests one at a time, assign VIP status, then send their personalized invitation." />
        ) : (
          invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-hi">{inv.guest_name}</span>
                  {inv.vip_level !== "regular" && (
                    <span className="flex items-center gap-1 text-xs text-amber">
                      <Sparkles className="size-3" /> {inv.custom_vip_label || titleCase(inv.vip_level)}
                    </span>
                  )}
                  <Badge tone={statusTone(inv.status)}>{titleCase(inv.status)}</Badge>
                </div>
                <div className="text-xs text-text-low">{inv.guest_email}</div>
              </div>
              <div className="flex items-center gap-3">
                {inv.status !== "accepted" && (
                  <button onClick={() => send(inv.id)} className="text-sm text-violet hover:underline cursor-pointer">
                    {inv.status === "pending" ? "Send" : "Resend"}
                  </button>
                )}
                {inv.status !== "accepted" && (
                  <button onClick={() => remove(inv.id)} className="text-text-low hover:text-red cursor-pointer">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AddGuestModal open={modalOpen} onClose={() => setModalOpen(false)} event={event} />
    </div>
  );
}

function AddGuestModal({ open, onClose, event }: { open: boolean; onClose: () => void; event: EventDetail }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vip, setVip] = useState<VipLevel>("regular");
  const [ticketTypeId, setTicketTypeId] = useState(event.ticket_types[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      await invitationsApi.create(event.id, { guest_name: name, guest_email: email, guest_phone: phone || null, vip_level: vip, ticket_type_id: ticketTypeId || null });
      toast.success("Guest added.");
      queryClient.invalidateQueries({ queryKey: ["invitations", event.id] });
      setName("");
      setEmail("");
      setPhone("");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not add guest.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add guest">
      <div className="space-y-4">
        <div>
          <Label required>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label required>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>VIP level</Label>
          <Select value={vip} onChange={(e) => setVip(e.target.value as VipLevel)}>
            {vipLevels.map((v) => (
              <option key={v} value={v}>{titleCase(v)}</option>
            ))}
          </Select>
        </div>
        {event.ticket_types.length > 0 && (
          <div>
            <Label>Ticket type</Label>
            <Select value={ticketTypeId} onChange={(e) => setTicketTypeId(e.target.value)}>
              {event.ticket_types.map((tt) => (
                <option key={tt.id} value={tt.id}>{tt.name}</option>
              ))}
            </Select>
          </div>
        )}
        <Button fullWidth loading={saving} onClick={save}>
          Add guest
        </Button>
      </div>
    </Modal>
  );
}
