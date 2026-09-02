"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { authApi } from "@/lib/api";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    await authApi.forgotPassword(data.email);
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <div className="flex flex-col items-center py-4 text-center">
          <MailCheck className="size-12 text-violet" />
          <p className="mt-4 text-text-mid">If that email is registered, we&apos;ve sent a password reset link.</p>
          <Link href="/login" className="mt-6 text-sm text-violet hover:underline">
            Back to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" error={errors.email?.message} {...register("email")} />
        </div>
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-mid">
        <Link href="/login" className="font-medium text-violet hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
