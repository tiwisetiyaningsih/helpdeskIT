"use client";

import React, { useEffect, useState } from "react";
import EditProfileModal from "./EditProfileModal";
import PencilIcon from "@/icons/pencil.svg";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/config";

type ProfileUser = {
  id: number;
  email: string;
  nama: string;
  role: string;
  isActive: boolean;
  employee: {
    nik: string;
    nama: string;
    jabatan: string;
    unitKerja: string;
    jobTitle?: string | null;
  } | null;
};

type ProfileResponse = {
  success: boolean;
  message?: string;
  user?: ProfileUser;
};

export default function UserInfoCard() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openEdit, setOpenEdit] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function getProfile() {
      try {
        setError("");

        const response = await apiFetch(`${API_URL}/auth/me`, {
          method: "GET",
        });

        const data = (await response.json()) as ProfileResponse;

        if (!response.ok || !data.success || !data.user) {
          throw new Error(
            data.message || "Gagal mengambil data profil."
          );
        }

        setUser(data.user);
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:p-6">
        <div className="animate-pulse space-y-5">
          <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-3 h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 p-5 dark:border-error-500/30 dark:bg-error-500/10 lg:p-6">
        <p className="text-sm font-medium text-error-600 dark:text-error-400">
          {error}
        </p>
      </div>
    );
  }

  const employee = user?.employee;

  const information = [
    {
      label: "Nama Lengkap",
      value: employee?.nama || user?.nama || "-",
    },
    {
      label: "Email",
      value: user?.email || "-",
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
      value: user?.role || "-",
    },
    {
      label: "Status Akun",
      value: user?.isActive ? "Aktif" : "Tidak Aktif",
    },
  ];

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
              Informasi Personal
            </h4>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Data akun dan informasi karyawan yang tersimpan di sistem.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccessMessage("");
              setOpenEdit(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-white/[0.03]"
          >
            <PencilIcon className="h-5 w-5 fill-current" />
            Edit
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-lg border border-success-200 bg-success-50 p-4 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          {information.map((item) => (
            <div key={item.label}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {item.label}
              </p>

              {item.label === "Status Akun" ? (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${user?.isActive
                    ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                    : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                    }`}
                >
                  {item.value}
                </span>
              ) : item.label === "Role" ? (
                <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {item.value}
                </span>
              ) : (
                <p className="break-words text-sm font-medium text-gray-800 dark:text-white/90">
                  {item.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <EditProfileModal
        isOpen={openEdit}
        user={user}
        onClose={() => setOpenEdit(false)}
        onSuccess={(updatedUser, message) => {
          setUser(updatedUser);
          setSuccessMessage(message);
          setOpenEdit(false);
        }}
      />
    </>
  );
}