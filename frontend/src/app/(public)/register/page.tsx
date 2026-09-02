"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { ApiException } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    first_name: z.string().min(1, "Required"),
    last_name: z.string().min(1, "Required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(6, "Enter a valid phone number"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[a-zA-Z]/, "Must contain a letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"attendee" | "organizer">("attendee");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const user = await registerUser({ ...data, role });
      toast.success("Account created! Check your email to verify.");
      router.push(user.role === "organizer" ? "/organizer" : "/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Registration failed.");
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Free to join. Browse instantly, register once you verify your email.">
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-line bg-ink p-1">
        <button
          type="button"
          onClick={() => setRole("attendee")}
          className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium cursor-pointer", role === "attendee" ? "bg-surface-raised text-text-hi" : "text-text-mid")}
        >
          <Ticket className="size-4" /> Attendee
        </button>
        <button
          type="button"
          onClick={() => setRole("organizer")}
          className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium cursor-pointer", role === "organizer" ? "bg-surface-raised text-text-hi" : "text-text-mid")}
        >
          <CalendarDays className="size-4" /> Organizer
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" error={errors.first_name?.message} {...register("first_name")} />
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" error={errors.last_name?.message} {...register("last_name")} />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" error={errors.email?.message} {...register("email")} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+234…" error={errors.phone?.message} {...register("phone")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" error={errors.password?.message} {...register("password")} />
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm</Label>
            <Input id="confirm_password" type="password" error={errors.confirm_password?.message} {...register("confirm_password")} />
          </div>
        </div>
        <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-2">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-mid">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-violet hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
