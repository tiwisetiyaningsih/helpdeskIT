"use client";

import React from "react";
import type { ProfileUser } from "./UserProfile";

type UserMetaCardProps = {
  user: ProfileUser;
};

function formatRole(role?: string) {
  const normalized = String(role || "").toUpperCase();

  const labels: Record<string, string> = {
    ADMIN: "Administrator",
    EMPLOYEE: "Karyawan",
    USER: "Karyawan",
    IT: "IT Support",
    CONSULTANT: "IT Konsultan",
  };

  return labels[normalized] || role || "-";
}

export default function UserMetaCard({
  user,
}: UserMetaCardProps) {
  const employee = user.employee;

  const nama =
    employee?.nama ||
    user.nama ||
    user.name ||
    "Pengguna";

  const jabatan = employee?.jabatan || "-";
  const unitKerja = employee?.unitKerja || "-";
  const nik = employee?.nik || "-";
  const email = user.email || "-";
  const role = formatRole(user.role);

  const initials = nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
            {initials || "U"}
          </div>

          <div className="text-center sm:text-left">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {nama}
            </h2>

            <div className="mt-2 flex flex-col gap-1 text-theme-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:items-center sm:gap-3">
              <span>{jabatan}</span>

              <span className="hidden h-4 w-px bg-gray-300 dark:bg-gray-700 sm:block" />

              <span>{unitKerja}</span>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {role}
              </span>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-theme-xs font-medium ${
                  user.isActive
                    ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                    : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                }`}
              >
                {user.isActive ? "Akun Aktif" : "Akun Tidak Aktif"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 border-t border-gray-100 pt-6 dark:border-gray-800 sm:grid-cols-2 lg:grid-cols-3">
        <MetaItem label="Email" value={email} />
        <MetaItem label="NIK" value={nik} />
        <MetaItem label="Role" value={role} />
      </div>
    </div>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-theme-sm font-medium text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}