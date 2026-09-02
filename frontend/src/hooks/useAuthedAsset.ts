"use client";

import { useEffect, useState } from "react";
import { tokenStore } from "@/lib/api";

/**
 * Fetches an authenticated binary asset (QR PNG, PDF ticket) client-side with
 * the Bearer token attached, and returns an object URL suitable for <img src>
 * or a download link -- since a plain <img>/<a> tag can't send custom headers.
 */
export function useAuthedAsset(url: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    let revoked = "";
    setLoading(true);
    fetch(url, { headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {} })
      .then((res) => res.blob())
      .then((blob) => {
        const objUrl = URL.createObjectURL(blob);
        revoked = objUrl;
        setObjectUrl(objUrl);
      })
      .finally(() => setLoading(false));

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [url]);

  return { objectUrl, loading };
}
