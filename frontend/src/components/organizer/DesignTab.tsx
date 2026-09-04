"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ApiException, eventsApi } from "@/lib/api";
import type { EventDetail, SectionType } from "@/lib/types";
import { cn } from "@/lib/utils";

const themeColors = ["#8b5cf6", "#f472b6", "#f5a623", "#34d399", "#3b82f6", "#ef4444"];
const bodySections: { type: SectionType; label: string }[] = [
  { type: "about", label: "About" },
  { type: "speakers", label: "Speakers" },
  { type: "schedule", label: "Schedule" },
  { type: "sponsors", label: "Sponsors" },
  { type: "contact", label: "Contact" },
];

export function DesignTab({ event, onChange }: { event: EventDetail; onChange: () => void }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(event.cover_image_url ?? null);
  const [logoUrl, setLogoUrl] = useState<string | null>(event.logo_url ?? null);
  const [themeColor, setThemeColor] = useState(event.theme_color);
  const [template, setTemplate] = useState(event.ticket_template);
  const [savingBrand, setSavingBrand] = useState(false);

  const [sectionBodies, setSectionBodies] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of event.sections) {
      if (s.section_type !== "faq" && typeof s.content.body === "string") map[s.section_type] = s.content.body;
    }
    return map;
  });
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const s of bodySections) map[s.type] = event.sections.some((sec) => sec.section_type === s.type);
    return map;
  });
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>(() => {
    const faq = event.sections.find((s) => s.section_type === "faq");
    return (faq?.content.items as { q: string; a: string }[]) ?? [];
  });
  const [faqEnabled, setFaqEnabled] = useState(!!event.sections.find((s) => s.section_type === "faq"));
  const [savingSections, setSavingSections] = useState(false);

  const saveBrand = async () => {
    setSavingBrand(true);
    try {
      await eventsApi.update(event.id, { cover_image_url: coverUrl, logo_url: logoUrl, theme_color: themeColor, ticket_template: template });
      toast.success("Design saved.");
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not save.");
    } finally {
      setSavingBrand(false);
    }
  };

  const saveSections = async () => {
    setSavingSections(true);
    try {
      const payload = [
        ...bodySections.filter((s) => enabledSections[s.type] && sectionBodies[s.type]?.trim()).map((s, i) => ({
          section_type: s.type,
          content: { body: sectionBodies[s.type] },
          order: i,
        })),
        ...(faqEnabled && faqItems.length > 0 ? [{ section_type: "faq", content: { items: faqItems }, order: 99 }] : []),
      ];
      await eventsApi.setSections(event.id, payload);
      toast.success("Sections saved.");
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not save sections.");
    } finally {
      setSavingSections(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="font-display text-lg text-text-hi">Brand</h3>
        <div className="mt-4 space-y-4">
          <div>
            <Label>Cover image</Label>
            <ImageUpload value={coverUrl} onChange={setCoverUrl} shape="banner" />
          </div>
          <div>
            <Label>Logo</Label>
            <ImageUpload value={logoUrl} onChange={setLogoUrl} shape="square" />
          </div>
          <div>
            <Label>Theme color</Label>
            <div className="flex gap-2.5">
              {themeColors.map((c) => (
                <button key={c} onClick={() => setThemeColor(c)} className="size-9 rounded-full cursor-pointer" style={{ background: c, boxShadow: themeColor === c ? `0 0 0 2px ${c}` : undefined }} />
              ))}
            </div>
          </div>
          <div>
            <Label>Ticket template</Label>
            <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
              {["classic", "premium", "corporate", "celebration", "minimal"].map((t) => (
                <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
          </div>
          <Button loading={savingBrand} onClick={saveBrand}>Save brand</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="font-display text-lg text-text-hi">Page sections</h3>
        <p className="mt-1 text-sm text-text-mid">Toggle sections on and fill them in — they appear on your public event page.</p>

        <div className="mt-5 space-y-4">
          {bodySections.map((s) => (
            <div key={s.type} className={cn("rounded-xl border p-4", enabledSections[s.type] ? "border-violet/30 bg-violet/5" : "border-line")}>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-hi">
                <input
                  type="checkbox"
                  checked={enabledSections[s.type] ?? false}
                  onChange={(e) => setEnabledSections((prev) => ({ ...prev, [s.type]: e.target.checked }))}
                  className="accent-violet"
                />
                {s.label}
              </label>
              {enabledSections[s.type] && (
                <Textarea
                  className="mt-3"
                  placeholder={`Write your ${s.label.toLowerCase()} content…`}
                  value={sectionBodies[s.type] ?? ""}
                  onChange={(e) => setSectionBodies((prev) => ({ ...prev, [s.type]: e.target.value }))}
                />
              )}
            </div>
          ))}

          <div className={cn("rounded-xl border p-4", faqEnabled ? "border-violet/30 bg-violet/5" : "border-line")}>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-hi">
              <input type="checkbox" checked={faqEnabled} onChange={(e) => setFaqEnabled(e.target.checked)} className="accent-violet" />
              FAQ
            </label>
            {faqEnabled && (
              <div className="mt-3 space-y-3">
                {faqItems.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Input placeholder="Question" value={item.q} onChange={(e) => setFaqItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, q: e.target.value } : it)))} />
                      <Input placeholder="Answer" value={item.a} onChange={(e) => setFaqItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, a: e.target.value } : it)))} />
                    </div>
                    <button onClick={() => setFaqItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-text-low hover:text-red cursor-pointer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setFaqItems((prev) => [...prev, { q: "", a: "" }])} className="flex items-center gap-1.5 text-sm text-violet hover:underline cursor-pointer">
                  <Plus className="size-3.5" /> Add question
                </button>
              </div>
            )}
          </div>
        </div>

        <Button className="mt-5" loading={savingSections} onClick={saveSections}>
          Save sections
        </Button>
      </div>
    </div>
  );
}
