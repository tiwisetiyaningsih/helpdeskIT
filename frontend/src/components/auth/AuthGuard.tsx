"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken } from "@/lib/apiFetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        const data = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok || !data?.token) {
          router.replace("/signin");
          return;
        }

        setAccessToken(data.token);
        setChecking(false);
      } catch {
        if (!cancelled) router.replace("/signin");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Mencegah dashboard tampil sebentar sebelum diarahkan
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Memeriksa sesi login...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}