"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiException, invitationsApi } from "@/lib/api";
import { formatDateTime, titleCase } from "@/lib/utils";

export default function GuestInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => invitationsApi.viewGuest(token),
  });

  const acceptMutation = useMutation({
    mutationFn: () => invitationsApi.acceptGuest(token),
    onSuccess: () => {
      toast.success("You're confirmed! Here's your ticket.");
      router.push(`/invite/${token}/ticket`);
    },
    onError: (err) => toast.error(err instanceof ApiException ? err.message : "Could not accept invitation."),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-5 py-24">
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl text-text-hi">Invitation not found</h1>
        <p className="mt-2 text-text-mid">This link may be invalid or expired.</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-5 py-16">
      <div
        className="pointer-events-none absolute left-1/2 top-0 size-[500px] -translate-x-1/2 rounded-full blur-[110px]"
        style={{ background: `${invite.theme_color}33` }}
      />
      <Reveal className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-line bg-surface shadow-2xl">
        <div
          className="relative flex h-40 items-end bg-cover bg-center p-6"
          style={
            invite.event_cover_image_url
              ? { backgroundImage: `url(${invite.event_cover_image_url})` }
              : { background: `linear-gradient(135deg, ${invite.theme_color}88, #0b0a10)` }
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        </div>
        <div className="p-8 text-center">
          <Badge tone="amber">
            <Sparkles className="size-3" /> {invite.custom_vip_label || titleCase(invite.vip_level)}
          </Badge>
          <h1 className="mt-4 font-display text-2xl text-text-hi">You&apos;re invited, {invite.guest_name.split(" ")[0]}!</h1>
          <p className="mt-2 text-text-mid">
            {invite.event_title} <br />
            <span className="text-sm text-text-low">{formatDateTime(invite.event_start_at)}</span>
          </p>
          {invite.event_venue && <p className="mt-1 text-sm text-text-low">{invite.event_venue}</p>}

          {invite.already_registered ? (
            <>
              <div className="mt-6 flex items-center justify-center gap-2 text-emerald">
                <CheckCircle2 className="size-5" /> You&apos;ve confirmed this invitation.
              </div>
              <Button fullWidth size="lg" className="mt-4" onClick={() => router.push(`/invite/${token}/ticket`)}>
                View my ticket
              </Button>
            </>
          ) : (
            <Button fullWidth size="lg" className="mt-6" loading={acceptMutation.isPending} onClick={() => acceptMutation.mutate()}>
              Confirm my spot
            </Button>
          )}
        </div>
      </Reveal>
    </div>
  );
}
