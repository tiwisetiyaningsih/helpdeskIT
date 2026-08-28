"use client";

import { apiFetch } from "@/lib/apiFetch";
import React, { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ProfileUser = {
  id?: number;
  name?: string;
  nama?: string;
  email?: string;
  role?: string;
  nik?: string;
  jabatan?: string;
  unitKerja?: string;
  employee?: {
    nik?: string;
    nama?: string;
    jabatan?: string;
    unitKerja?: string;
  };
};

export default function UserMetaCard() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getProfile() {
      try {
        const response = await apiFetch(
          `${API_URL}/auth/me`,
          {
            method: "GET",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Gagal mengambil data profil."
          );
        }

        // Mendukung response { user: {...} } atau langsung {...}
        setUser(data.user ?? data);
      } catch (error: unknown) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Terjadi kesalahan saat mengambil profil.");
        }
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Memuat data profil...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/20 dark:bg-error-500/10">
        <p className="text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      </div>
    );
  }

  const nama =
    user?.employee?.nama ||
    user?.nama ||
    user?.name ||
    "Pengguna";

  const email = user?.email || "-";

  const role = user?.role || "User";

  const jabatan =
    user?.employee?.jabatan ||
    user?.jabatan ||
    "-";

  const unitKerja =
    user?.employee?.unitKerja ||
    user?.unitKerja ||
    "-";

  const nik =
    user?.employee?.nik ||
    user?.nik ||
    "-";

  const initials = nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          {/* Avatar */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            {initials || "U"}
          </div>

          {/* Informasi utama */}
          <div className="text-center sm:text-left">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {nama}
            </h4>

            <div className="mt-2 flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:gap-3">
              <span>{jabatan}</span>

              <span className="hidden h-4 w-px bg-gray-300 dark:bg-gray-700 sm:block" />

              <span>{unitKerja}</span>
            </div>

            <span className="mt-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Detail singkat */}
      <div className="mt-6 grid grid-cols-1 gap-5 border-t border-gray-200 pt-6 dark:border-gray-800 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Email
          </p>
          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
            {email}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            NIK
          </p>
          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
            {nik}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Role
          </p>
          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}