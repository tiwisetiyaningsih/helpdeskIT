"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/signin");
      return;
    }

    setChecking(false);
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