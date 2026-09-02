"use client";

import { CheckCircle2, Loader2, MailWarning, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { ApiException, authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const { refreshUser, user } = useAuth();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Missing verification token.");
      return;
    }
    authApi
      .verifyEmail(token)
      .then(async () => {
        setState("success");
        await refreshUser();
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof ApiException ? err.message : "Verification failed.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resend = async () => {
    if (!user?.email) return;
    try {
      await authApi.resendVerification(user.email);
    } catch {
      /* toast not critical here */
    }
  };

  return (
    <AuthShell title="Email verification">
      <div className="flex flex-col items-center py-6 text-center">
        {state === "loading" && <Loader2 className="size-10 animate-spin text-violet" />}
        {state === "success" && (
          <>
            <CheckCircle2 className="size-14 text-emerald" />
            <p className="mt-4 text-text-hi">Your email is verified. You can now register for events and buy tickets.</p>
            <Link href="/dashboard">
              <Button className="mt-6">Go to dashboard</Button>
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="size-14 text-red" />
            <p className="mt-4 text-text-hi">{error}</p>
            <button onClick={resend} className="mt-4 flex items-center gap-1.5 text-sm text-violet hover:underline cursor-pointer">
              <MailWarning className="size-4" /> Resend verification email
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
