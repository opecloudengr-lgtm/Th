"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, Camera, CheckCircle2, Keyboard, Sparkles, XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ApiException, checkinsApi } from "@/lib/api";
import type { TicketVerificationView } from "@/lib/types";
import { cn, titleCase } from "@/lib/utils";

type Mode = "scan" | "manual";

export default function VerifyEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [mode, setMode] = useState<Mode>("scan");
  const [result, setResult] = useState<TicketVerificationView | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastToken, setLastToken] = useState<{ token?: string; ticket_code?: string } | null>(null);

  const verify = async (payload: { token?: string; ticket_code?: string }) => {
    setVerifying(true);
    setLastToken(payload);
    try {
      const view = await checkinsApi.verify(eventId, payload);
      setResult(view);
    } catch (err) {
      setResult({
        valid: false,
        reason: err instanceof ApiException ? err.message : "Could not verify ticket.",
        ticket_id: null, ticket_code: null, status: null, attendee_name: null, ticket_type_name: null,
        vip_level: null, vip_label: null, seat_label: null, payment_status: null, is_free_ticket: null,
        event_title: null, already_checked_in: false, checked_in_at: null, checked_in_by: null,
      });
    } finally {
      setVerifying(false);
    }
  };

  const confirmCheckIn = async () => {
    if (!lastToken) return;
    setCheckingIn(true);
    try {
      const view = await checkinsApi.checkin(eventId, { ...lastToken, method: mode === "scan" ? "qr" : "manual" });
      setResult(view);
    } catch (err) {
      setResult((prev) => (prev ? { ...prev, valid: false, reason: err instanceof ApiException ? err.message : "Check-in failed." } : prev));
    } finally {
      setCheckingIn(false);
    }
  };

  const reset = () => {
    setResult(null);
    setManualCode("");
    setLastToken(null);
  };

  return (
    <div>
      <Link href="/verify" className="mb-5 flex items-center gap-1.5 text-sm text-text-mid hover:text-text-hi">
        <ArrowLeft className="size-4" /> Change event
      </Link>

      {!result && (
        <>
          <div className="mb-5 flex gap-2 rounded-xl border border-line bg-ink-soft p-1">
            <button
              onClick={() => setMode("scan")}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium cursor-pointer", mode === "scan" ? "bg-surface-raised text-text-hi" : "text-text-mid")}
            >
              <Camera className="size-4" /> Scan QR
            </button>
            <button
              onClick={() => setMode("manual")}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium cursor-pointer", mode === "manual" ? "bg-surface-raised text-text-hi" : "text-text-mid")}
            >
              <Keyboard className="size-4" /> Manual entry
            </button>
          </div>

          {mode === "scan" ? (
            <QrScanner onDecode={(token) => verify({ token })} busy={verifying} />
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCode.trim()) verify({ ticket_code: manualCode.trim() });
                }}
                className="space-y-4"
              >
                <Input placeholder="EVT-XXXXXXXX" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} className="text-center font-mono text-lg tracking-widest" autoFocus />
                <Button type="submit" fullWidth loading={verifying}>
                  Verify ticket
                </Button>
              </form>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <ResultCard result={result} checkingIn={checkingIn} onCheckIn={confirmCheckIn} onReset={reset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({
  result,
  checkingIn,
  onCheckIn,
  onReset,
}: {
  result: TicketVerificationView;
  checkingIn: boolean;
  onCheckIn: () => void;
  onReset: () => void;
}) {
  const alreadyProcessed = result.status === "used" && result.checked_in_at && result.valid;

  return (
    <div className={cn("overflow-hidden rounded-2xl border-2 p-6 text-center", result.valid ? "border-emerald bg-emerald/5" : "border-red bg-red/5")}>
      {result.valid ? <CheckCircle2 className="mx-auto size-16 text-emerald" /> : <XCircle className="mx-auto size-16 text-red" />}

      <h2 className="mt-4 font-display text-2xl text-text-hi">
        {alreadyProcessed ? "Checked in!" : result.valid ? "Valid ticket" : "Access denied"}
      </h2>
      {result.reason && <p className="mt-1 text-sm text-text-mid">{result.reason}</p>}

      {result.attendee_name && (
        <div className="mt-6 space-y-2 rounded-xl bg-ink/40 p-4 text-left">
          <Row label="Attendee" value={result.attendee_name} />
          <Row label="Event" value={result.event_title} />
          <Row label="Ticket type" value={result.ticket_type_name} />
          <Row
            label="VIP level"
            value={
              result.vip_level && result.vip_level !== "regular" ? (
                <span className="flex items-center gap-1 text-amber">
                  <Sparkles className="size-3.5" /> {result.vip_label}
                </span>
              ) : (
                "Regular"
              )
            }
          />
          {result.seat_label && <Row label="Seat" value={result.seat_label} />}
          <Row
            label="Payment"
            value={result.is_free_ticket ? <Badge tone="neutral">Free</Badge> : <Badge tone={result.payment_status === "success" ? "emerald" : "amber"}>{titleCase(result.payment_status ?? "")}</Badge>}
          />
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {result.valid && !alreadyProcessed ? (
          <>
            <Button variant="secondary" fullWidth onClick={onReset}>
              Cancel
            </Button>
            <Button fullWidth loading={checkingIn} onClick={onCheckIn}>
              <CheckCircle2 className="size-4" /> Check in now
            </Button>
          </>
        ) : (
          <Button fullWidth onClick={onReset}>
            {alreadyProcessed ? "Scan next ticket" : "Try again"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-low">{label}</span>
      <span className="font-medium text-text-hi">{value}</span>
    </div>
  );
}

function QrScanner({ onDecode, busy }: { onDecode: (text: string) => void; busy: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let started = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled || !containerRef.current) return;
      const scanner = new Html5Qrcode(containerRef.current.id);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (!busy) onDecode(decodedText);
          },
          () => {}
        )
        .then(() => {
          started = true;
          if (!cancelled) setReady(true);
          else stopScanner(); // unmounted while start() was in flight
        })
        .catch(() => {
          if (!cancelled) setError("Could not access camera. Check permissions, or use manual entry instead.");
        });
    });

    function stopScanner() {
      // html5-qrcode's stop() throws synchronously (not a rejected promise)
      // if the camera never actually started -- guard with try/catch, not
      // just .catch(), or it crashes the component tree on unmount.
      if (!started) return;
      try {
        scannerRef.current
          ?.stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
      } catch {
        /* not running -- nothing to stop */
      }
    }

    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface p-4">
      {error ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-amber">
          <AlertCircle className="size-8" />
          {error}
        </div>
      ) : (
        <>
          <div id="qr-reader" ref={containerRef} className="mx-auto overflow-hidden rounded-xl [&_video]:rounded-xl" />
          {!ready && <p className="mt-3 text-center text-xs text-text-low">Starting camera…</p>}
          {busy && <p className="mt-3 text-center text-xs text-violet">Verifying…</p>}
        </>
      )}
    </div>
  );
}
