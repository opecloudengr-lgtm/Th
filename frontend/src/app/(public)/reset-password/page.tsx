"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { ApiException, authApi } from "@/lib/api";

const schema = z
  .object({
    new_password: z.string().min(8, "At least 8 characters").regex(/[a-zA-Z]/).regex(/[0-9]/),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });
type FormData = z.infer<typeof schema>;

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.resetPassword(token, data.new_password, data.confirm_password);
      setDone(true);
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not reset password.");
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="flex flex-col items-center py-4 text-center">
          <CheckCircle2 className="size-12 text-emerald" />
          <p className="mt-4 text-text-mid">You can now log in with your new password.</p>
          <Link href="/login">
            <Button className="mt-6">Log in</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="new_password">New password</Label>
          <Input id="new_password" type="password" error={errors.new_password?.message} {...register("new_password")} />
        </div>
        <div>
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input id="confirm_password" type="password" error={errors.confirm_password?.message} {...register("confirm_password")} />
        </div>
        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
