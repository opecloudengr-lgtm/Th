"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ApiException } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";

const profileSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone: z.string().min(6, "Enter a valid phone number"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Required"),
    new_password: z.string().min(8, "At least 8 characters").regex(/[a-zA-Z]/).regex(/[0-9]/),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: user ? { first_name: user.first_name, last_name: user.last_name, phone: user.phone } : undefined,
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const [pwOpen, setPwOpen] = useState(false);

  const onSaveProfile = async (data: ProfileForm) => {
    try {
      await authApi.updateProfile(data);
      await refreshUser();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not update profile.");
    }
  };

  const onAvatarChange = async (url: string | null) => {
    try {
      await authApi.updateProfile({ avatar_url: url });
      await refreshUser();
      toast.success(url ? "Photo updated." : "Photo removed.");
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not update photo.");
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    try {
      await authApi.changePassword(data.current_password, data.new_password);
      toast.success("Password changed.");
      passwordForm.reset();
      setPwOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Could not change password.");
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Reveal>
        <h1 className="font-display text-3xl text-text-hi">Profile</h1>
        <p className="mt-1 text-text-mid">Manage your account details.</p>
      </Reveal>

      <Reveal delay={0.05} className="flex items-center gap-5 rounded-2xl border border-line bg-surface p-6">
        <ImageUpload value={user.avatar_url} onChange={onAvatarChange} shape="square" className="rounded-full" />
        <div>
          <div className="font-display text-lg text-text-hi">{user.first_name} {user.last_name}</div>
          <div className="text-sm text-text-mid">{user.email}</div>
          <div className="mt-1.5 flex gap-1.5">
            <Badge tone="violet">{user.role}</Badge>
            <Badge tone={user.is_email_verified ? "emerald" : "amber"}>{user.is_email_verified ? "Verified" : "Unverified"}</Badge>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg text-text-hi">Personal information</h2>
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First name</Label>
              <Input error={profileForm.formState.errors.first_name?.message} {...profileForm.register("first_name")} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input error={profileForm.formState.errors.last_name?.message} {...profileForm.register("last_name")} />
            </div>
          </div>
          <div>
            <Label>Phone</Label>
            <Input error={profileForm.formState.errors.phone?.message} {...profileForm.register("phone")} />
          </div>
          <Button type="submit" loading={profileForm.formState.isSubmitting}>
            Save changes
          </Button>
        </form>
      </Reveal>

      <Reveal delay={0.15} className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-text-hi">Password</h2>
          <button onClick={() => setPwOpen((v) => !v)} className="text-sm text-violet hover:underline cursor-pointer">
            {pwOpen ? "Cancel" : "Change password"}
          </button>
        </div>
        {pwOpen && (
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="mt-4 space-y-4">
            <div>
              <Label>Current password</Label>
              <Input type="password" error={passwordForm.formState.errors.current_password?.message} {...passwordForm.register("current_password")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>New password</Label>
                <Input type="password" error={passwordForm.formState.errors.new_password?.message} {...passwordForm.register("new_password")} />
              </div>
              <div>
                <Label>Confirm</Label>
                <Input type="password" error={passwordForm.formState.errors.confirm?.message} {...passwordForm.register("confirm")} />
              </div>
            </div>
            <Button type="submit" loading={passwordForm.formState.isSubmitting}>
              Update password
            </Button>
          </form>
        )}
      </Reveal>
    </div>
  );
}
