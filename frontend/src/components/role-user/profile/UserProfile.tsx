"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import UserMetaCard from "./UserMetaCard";
import UserInfoCard from "./UserInfoCard";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/config";

export type ProfileUser = {
  id: number;
  email: string;
  nama?: string;
  name?: string;
  role: string;
  isActive: boolean;

  employee: {
    id?: number;
    nik: string;
    nama: string;
    jabatan: string;
    unitKerja: string;
    jobTitle?: string | null;
  } | null;
};

type ProfileResponse = {
  success?: boolean;
  message?: string;
  user?: ProfileUser;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const responseText = await response.text();

    console.error("Response bukan JSON:", responseText);

    throw new Error(
      "Backend tidak mengembalikan JSON. Periksa URL dan endpoint API."
    );
  }

  return response.json() as Promise<T>;
}

export default function UserProfile() {
  const router = useRouter();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const data =
        await parseJsonResponse<ProfileResponse>(response);

      if (!response.ok || !data.user) {
        throw new Error(
          data.message || "Gagal mengambil data profil."
        );
      }

      setUser(data.user);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil profil.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void getProfile();
  }, [getProfile]);

  function handleProfileUpdated(updatedUser: ProfileUser) {
    setUser(updatedUser);

    const oldSavedUser = localStorage.getItem("user");

    let savedUserData: Record<string, unknown> = {};

    if (oldSavedUser) {
      try {
        savedUserData = JSON.parse(oldSavedUser);
      } catch {
        savedUserData = {};
      }
    }

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...savedUserData,
        id: updatedUser.id,
        email: updatedUser.email,
        nama:
          updatedUser.employee?.nama ||
          updatedUser.nama ||
          updatedUser.name ||
          "User",
        name:
          updatedUser.employee?.nama ||
          updatedUser.nama ||
          updatedUser.name ||
          "User",
        role: updatedUser.role,
      })
    );

    window.dispatchEvent(new Event("user-profile-updated"));
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-title-sm font-bold text-gray-800 dark:text-white/90 sm:text-title-md">
            Profil Saya
          </h1>

          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Informasi akun dan data karyawan Anda.
          </p>
        </div>

        <div className="rounded-2xl border border-error-200 bg-error-50 p-5 dark:border-error-500/30 dark:bg-error-500/10">
          <p className="text-theme-sm font-medium text-error-700 dark:text-error-400">
            {error || "Data profil tidak ditemukan."}
          </p>

          <button
            type="button"
            onClick={() => void getProfile()}
            className="mt-4 rounded-lg bg-error-500 px-4 py-2.5 text-theme-sm font-medium text-white hover:bg-error-600"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-sm font-bold text-gray-800 dark:text-white/90 sm:text-title-md">
          Profil Saya
        </h1>

        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Kelola informasi akun dan lihat data karyawan Anda.
        </p>
      </div>

      <UserMetaCard user={user} />

      <UserInfoCard
        user={user}
        onUserUpdated={handleProfileUpdated}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-44 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex animate-pulse flex-col gap-5 sm:flex-row sm:items-center">
          <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />

          <div className="space-y-3">
            <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="animate-pulse">
          <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index}>
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="mt-3 h-4 w-40 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}