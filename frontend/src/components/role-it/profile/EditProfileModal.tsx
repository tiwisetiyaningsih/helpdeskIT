"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import type { ProfileIt } from "./ItProfile";
import { apiFetch } from "@/lib/apiFetch";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

type EditProfileModalProps = {
  isOpen: boolean;
  user: ProfileIt | null;
  onClose: () => void;
  onSuccess: (
    updatedUser: ProfileIt,
    message: string
  ) => void;
};

type EditProfileForm = {
  nama: string;
  email: string;
  jobTitle: string;
};

type UpdateProfileResponse = {
  success?: boolean;
  message?: string;
  user?: ProfileIt;
};

const initialForm: EditProfileForm = {
  nama: "",
  email: "",
  jobTitle: "",
};

async function parseJsonResponse<T>(
  response: Response
): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const responseText = await response.text();

    console.error("Response backend bukan JSON:", responseText);

    throw new Error(
      "Backend tidak mengembalikan JSON. Periksa endpoint update profil."
    );
  }

  return response.json() as Promise<T>;
}

export default function EditProfileModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const [form, setForm] =
    useState<EditProfileForm>(initialForm);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    setForm({
      nama:
        user.employee?.nama ||
        user.nama ||
        user.name ||
        "",
      email: user.email || "",
      jobTitle: user.employee?.jobTitle || "",
    });

    setError("");
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen, submitting, onClose]);

  if (!isOpen || !user) {
    return null;
  }

  function handleClose() {
    if (submitting) {
      return;
    }

    setError("");
    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const nama = form.nama.trim();
      const email = form.email.trim();
      const jobTitle = form.jobTitle.trim();

      if (!nama) {
        throw new Error("Nama lengkap wajib diisi.");
      }

      if (!email) {
        throw new Error("Email wajib diisi.");
      }

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        throw new Error("Format email tidak valid.");
      }

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Sesi login tidak ditemukan. Silakan login kembali."
        );
      }

      const response = await apiFetch(
        `${API_URL}/auth/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            nama,
            email,
            jobTitle: jobTitle || null,
          }),
        }
      );

      const data =
        await parseJsonResponse<UpdateProfileResponse>(
          response
        );

      if (
        !response.ok ||
        data.success === false ||
        !data.user
      ) {
        throw new Error(
          data.message ||
            "Gagal memperbarui profil."
        );
      }

      onSuccess(
        data.user,
        data.message ||
          "Profil berhasil diperbarui."
      );
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memperbarui profil."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2
              id="edit-profile-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              Edit Profil
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Perbarui informasi profil pribadi Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Tutup modal"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-6">
            {error && (
              <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="profile-name"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Nama Lengkap
                <span className="ml-1 text-error-500">
                  *
                </span>
              </label>

              <input
                id="profile-name"
                type="text"
                value={form.nama}
                disabled={submitting}
                placeholder="Masukkan nama lengkap"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nama: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
                <span className="ml-1 text-error-500">
                  *
                </span>
              </label>

              <input
                id="profile-email"
                type="email"
                value={form.email}
                disabled={submitting}
                placeholder="Masukkan email"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
              />
            </div>

            <div>
              <label
                htmlFor="profile-job-title"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Job Title
              </label>

              <input
                id="profile-job-title"
                type="text"
                value={form.jobTitle}
                disabled={submitting}
                placeholder="Masukkan job title"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    jobTitle: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                Data yang tidak dapat diubah
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                NIK, jabatan, unit kerja, role, dan
                status akun hanya dapat diubah oleh
                administrator.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Menyimpan..."
                : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}