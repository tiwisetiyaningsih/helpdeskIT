"use client";

import React, { useState } from "react";
import PencilIcon from "@/icons/pencil.svg";
import type { ProfileIt } from "./ItProfile";

type UserInfoCardProps = {
  user: ProfileIt;
  onUserUpdated: (updatedUser: ProfileIt) => void;
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

export default function UserInfoCard({
  user,
  onUserUpdated,
}: UserInfoCardProps) {
  const [openEdit, setOpenEdit] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const employee = user.employee;

  const information = [
    {
      label: "Nama Lengkap",
      value:
        employee?.nama ||
        user.nama ||
        user.name ||
        "-",
    },
    {
      label: "Email",
      value: user.email || "-",
    },
    {
      label: "NIK",
      value: employee?.nik || "-",
    },
    {
      label: "Jabatan",
      value: employee?.jabatan || "-",
    },
    {
      label: "Unit Kerja",
      value: employee?.unitKerja || "-",
    },
    {
      label: "Job Title",
      value: employee?.jobTitle || "-",
    },
    {
      label: "Role",
      value: formatRole(user.role),
    },
    {
      label: "Status Akun",
      value: user.isActive ? "Aktif" : "Tidak Aktif",
    },
  ];

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Informasi Personal
            </h2>

            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              Data akun dan informasi karyawan yang tersimpan di
              sistem.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-lg border border-success-200 bg-success-50 p-4 text-theme-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          {information.map((item) => (
            <div key={item.label}>
              <p className="mb-2 text-theme-xs font-medium uppercase tracking-wide text-gray-400">
                {item.label}
              </p>

              {item.label === "Status Akun" ? (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-medium ${
                    user.isActive
                      ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                      : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                  }`}
                >
                  {item.value}
                </span>
              ) : item.label === "Role" ? (
                <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {item.value}
                </span>
              ) : (
                <p className="break-words text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {item.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}