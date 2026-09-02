"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { ApiException, eventsApi } from "@/lib/api";

const schema = z
  .object({
    title: z.string().min(3, "At least 3 characters"),
    description: z.string().optional(),
    category: z.string().min(1),
    event_format: z.enum(["physical", "online", "hybrid"]),
    registration_mode: z.enum(["public", "private"]),
    venue_name: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    online_url: z.string().optional(),
    start_at: z.string().min(1, "Required"),
    end_at: z.string().min(1, "Required"),
    theme_color: z.string(),
    currency: z.string(),
  })
  .refine((d) => new Date(d.end_at) > new Date(d.start_at), { message: "End must be after start", path: ["end_at"] });
type FormData = z.infer<typeof schema>;

const categories = [
  "conference", "seminar", "workshop", "webinar", "training", "masterclass", "summit", "networking",
  "wedding", "birthday", "graduation", "anniversary", "party", "church_event", "other",
];

const themeColors = ["#8b5cf6", "#f472b6", "#f5a623", "#34d399", "#3b82f6", "#ef4444"];

export default function CreateEventPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { event_format: "physical", registration_mode: "public", theme_color: "#8b5cf6", currency: "NGN" },
  });

  const format = watch("event_format");
  const themeColor = watch("theme_color");

  const onSubmit = async (data: FormData) => {
    try {
      const event = await eventsApi.create({
        ...data,
        start_at: new Date(data.start_at).toISOString(),
        end_at: new Date(data.end_at).toISOString(),
      });
      toast.success("Event created! Now add ticket types and publish when ready.");
      router.push(`/organizer/events/${event.id}`);
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not create event.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Reveal>
        <h1 className="font-display text-3xl text-text-hi">Create an event</h1>
        <p className="mt-1 text-text-mid">Start with the basics — you can add tickets, seating, and design after.</p>
      </Reveal>

      <Reveal delay={0.05}>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div>
            <Label htmlFor="title" required>Event title</Label>
            <Input id="title" placeholder="Lagos Tech Summit 2026" error={errors.title?.message} {...register("title")} />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="What's this event about?" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Category</Label>
              <Select {...register("category")}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label required>Format</Label>
              <Select {...register("event_format")}>
                <option value="physical">In-person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </div>
          </div>

          <div>
            <Label required>Who can register</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line p-3 has-[:checked]:border-violet has-[:checked]:bg-violet/10">
                <input type="radio" value="public" {...register("registration_mode")} className="accent-violet" />
                <span className="text-sm text-text-hi">Public — anyone can find & join</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line p-3 has-[:checked]:border-violet has-[:checked]:bg-violet/10">
                <input type="radio" value="private" {...register("registration_mode")} className="accent-violet" />
                <span className="text-sm text-text-hi">Private — invite only</span>
              </label>
            </div>
          </div>

          {format !== "online" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Venue name</Label>
                <Input placeholder="Eko Convention Center" {...register("venue_name")} />
              </div>
              <div>
                <Label>City</Label>
                <Input {...register("city")} />
              </div>
              <div>
                <Label>Country</Label>
                <Input {...register("country")} />
              </div>
            </div>
          )}

          {format !== "physical" && (
            <div>
              <Label>Online link</Label>
              <Input placeholder="https://meet…" {...register("online_url")} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Starts</Label>
              <Input type="datetime-local" error={errors.start_at?.message} {...register("start_at")} />
            </div>
            <div>
              <Label required>Ends</Label>
              <Input type="datetime-local" error={errors.end_at?.message} {...register("end_at")} />
            </div>
          </div>

          <div>
            <Label>Theme color</Label>
            <div className="flex gap-2.5">
              {themeColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("theme_color", c)}
                  className="size-9 rounded-full ring-offset-2 ring-offset-surface"
                  style={{ background: c, boxShadow: themeColor === c ? `0 0 0 2px ${c}` : undefined }}
                />
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            Create event (draft)
          </Button>
        </form>
      </Reveal>
    </div>
  );
}
