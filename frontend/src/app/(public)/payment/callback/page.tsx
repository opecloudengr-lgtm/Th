"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { ApiException, paymentsApi } from "@/lib/api";

function CallbackInner() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference) {
      setState("error");
      setError("Missing payment reference.");
      return;
    }
    paymentsApi
      .verify(reference)
      .then((payment) => {
        if (payment.status === "success") setState("success");
        else {
          setState("error");
          setError("Payment was not successful. If you were charged, contact the organizer.");
        }
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof ApiException ? err.message : "Could not verify payment.");
      });
  }, [reference]);

  return (
    <AuthShell title="Payment status">
      <div className="flex flex-col items-center py-6 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="size-12 animate-spin text-violet" />
            <p className="mt-4 text-text-mid">Confirming your payment with Paystack…</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="size-14 text-emerald" />
            <p className="mt-4 text-text-hi">Payment confirmed! Your ticket has been issued.</p>
            <Link href="/dashboard/tickets">
              <Button className="mt-6">View my tickets</Button>
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="size-14 text-red" />
            <p className="mt-4 text-text-hi">{error}</p>
            <Link href="/dashboard/tickets" className="mt-4 text-sm text-violet hover:underline">
              Check my tickets anyway
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
