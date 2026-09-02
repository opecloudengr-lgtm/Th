"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui/Skeleton";
import type { UserRole } from "@/lib/types";

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <>{children}</>;
}
