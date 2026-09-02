"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { ApiException, eventsApi } from "@/lib/api";
import type { EventDetail } from "@/lib/types";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SettingsTab({ event, onChange }: { event: EventDetail; onChange: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [venue, setVenue] = useState(event.venue_name ?? "");
  const [city, setCity] = useState(event.city ?? "");
  const [startAt, setStartAt] = useState(toLocalInput(event.start_at));
  const [endAt, setEndAt] = useState(toLocalInput(event.end_at));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const saveDetails = async () => {
    setSaving(true);
    try {
      await eventsApi.update(event.id, {
        title,
        description,
        venue_name: venue,
        city,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      });
      toast.success("Event updated.");
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not update event.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: () => Promise<unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(successMsg);
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async () => {
    if (!confirm("Delete this event permanently? This cannot be undone.")) return;
    try {
      await eventsApi.remove(event.id);
      toast.success("Event deleted.");
      router.push("/organizer/events");
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not delete event (it may already have registrations).");
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="font-display text-lg text-text-hi">Details</h3>
        <div className="mt-4 space-y-4">
          <div>
            <Label required>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Venue</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label>Starts</Label>
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div>
              <Label>Ends</Label>
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
          <Button loading={saving} onClick={saveDetails}>Save details</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="font-display text-lg text-text-hi">Visibility</h3>
        <p className="mt-1 text-sm text-text-mid">
          {event.status === "published" ? "Your event is live and visible to attendees." : event.status === "draft" ? "Your event is a draft — only you can see it." : "This event is no longer active."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {event.status !== "published" && event.status !== "cancelled" && (
            <Button loading={busy} onClick={() => runAction(() => eventsApi.publish(event.id), "Event published!")}>
              <CheckCircle2 className="size-4" /> Publish event
            </Button>
          )}
          {event.status === "published" && (
            <Button variant="secondary" loading={busy} onClick={() => runAction(() => eventsApi.unpublish(event.id), "Event moved back to draft.")}>
              <EyeOff className="size-4" /> Unpublish
            </Button>
          )}
          {event.status !== "cancelled" && (
            <Button variant="outline" loading={busy} onClick={() => runAction(() => eventsApi.cancel(event.id), "Event cancelled.")}>
              <AlertTriangle className="size-4" /> Cancel event
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-red/30 bg-red/5 p-6">
        <h3 className="font-display text-lg text-text-hi">Danger zone</h3>
        <p className="mt-1 text-sm text-text-mid">Deleting is only possible if this event has no registrations.</p>
        <Button variant="danger" className="mt-4" onClick={deleteEvent}>
          <Trash2 className="size-4" /> Delete event
        </Button>
      </div>
    </div>
  );
}
