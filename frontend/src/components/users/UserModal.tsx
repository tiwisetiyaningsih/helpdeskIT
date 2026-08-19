"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createUser,
  EmployeeOption,
  getUserFormOptions,
  RoleOption,
  updateUser,
  User,
} from "@/services/user.service";


type UserModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

type FormData = {
  employeeId: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
};

const initialForm: FormData = {
  employeeId: "",
  email: "",
  password: "",
  roleId: "",
  isActive: true,
};

export default function UserModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: UserModalProps) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isEdit = Boolean(user);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setShowPassword(false);

    if (user) {
      setForm({
        employeeId: String(user.employeeId),
        email: user.email,
        password: "",
        roleId: String(user.roleId),
        isActive: user.isActive,
      });
    } else {
      setForm(initialForm);
    }

    async function loadOptions() {
      try {
        setLoadingOptions(true);

        const result = await getUserFormOptions();

        setEmployees(result.employees);
        setRoles(result.roles);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil pilihan form."
        );
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, [isOpen, user]);

  if (!isOpen) return null;

  function handleClose() {
    if (!submitting) {
      onClose();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      if (!form.employeeId) {
        throw new Error("Employee wajib dipilih.");
      }

      if (!form.email.trim()) {
        throw new Error("Email wajib diisi.");
      }

      if (!form.roleId) {
        throw new Error("Role wajib dipilih.");
      }

      if (!isEdit && form.password.length < 6) {
        throw new Error("Password minimal 6 karakter.");
      }

      if (
        isEdit &&
        form.password &&
        form.password.length < 6
      ) {
        throw new Error("Password minimal 6 karakter.");
      }

      const payload = {
        employeeId: Number(form.employeeId),
        email: form.email.trim(),
        password: form.password || undefined,
        roleId: Number(form.roleId),
        isActive: form.isActive,
      };

      if (user) {
        await updateUser(user.id, payload);
        onSuccess("User berhasil diperbarui.");
      } else {
        await createUser(payload);
        onSuccess("User berhasil ditambahkan.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan user."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const availableEmployees = employees.filter(
    (employee) =>
      !employee.user ||
      employee.id === Number(form.employeeId)
  );

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={handleClose}
    >
      <div
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEdit ? "Edit User" : "Tambah User"}
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isEdit
                ? "Perbarui informasi akun pengguna."
                : "Tambahkan akun baru untuk mengakses aplikasi."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg px-3 py-2 text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
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
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Employee
              </label>

              <div className="relative">
                <select
                  value={form.employeeId}
                  disabled={loadingOptions || submitting}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                  className="
        h-12 w-full appearance-none rounded-xl
        border border-gray-300 bg-white
        pl-4 pr-12 text-sm text-gray-800
        shadow-theme-xs outline-none
        transition
        focus:border-brand-400
        focus:ring-3 focus:ring-brand-500/10
        disabled:cursor-not-allowed
        disabled:bg-gray-100
        dark:border-gray-700
        dark:bg-gray-900
        dark:text-white/90
        dark:disabled:bg-gray-800
      "
                >
                  <option value="">
                    {loadingOptions
                      ? "Memuat employee..."
                      : "Pilih employee"}
                  </option>

                  {availableEmployees.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                    >
                      {employee.nik} - {employee.nama}
                    </option>
                  ))}
                </select>

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  <ChevronDownIcon />
                </span>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  disabled={submitting}
                  placeholder="contoh@email.com"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>

                <div className="relative">
                  <select
                    value={form.roleId}
                    disabled={loadingOptions || submitting}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        roleId: event.target.value,
                      }))
                    }
                    className="
        h-12 w-full appearance-none rounded-xl
        border border-gray-300 bg-white
        pl-4 pr-12 text-sm text-gray-800
        shadow-theme-xs outline-none
        transition
        focus:border-brand-400
        focus:ring-3 focus:ring-brand-500/10
        disabled:cursor-not-allowed
        disabled:bg-gray-100
        dark:border-gray-700
        dark:bg-gray-900
        dark:text-white/90
        dark:disabled:bg-gray-800
      "
                  >
                    <option value="">
                      {loadingOptions
                        ? "Memuat role..."
                        : "Pilih role"}
                    </option>

                    {roles.map((role) => (
                      <option
                        key={role.id}
                        value={role.id}
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    <ChevronDownIcon />
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  disabled={submitting}
                  placeholder={
                    isEdit
                      ? "Kosongkan jika tidak ingin mengganti password"
                      : "Minimal 6 karakter"
                  }
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className="
        h-12 w-full rounded-xl
        border border-gray-300 bg-white
        px-4 pr-12 text-sm text-gray-800
        shadow-theme-xs outline-none
        transition
        placeholder:text-gray-400
        focus:border-brand-400
        focus:ring-3 focus:ring-brand-500/10
        disabled:cursor-not-allowed
        disabled:bg-gray-100
        dark:border-gray-700
        dark:bg-gray-900
        dark:text-white/90
        dark:disabled:bg-gray-800
      "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  disabled={submitting}
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Lihat password"
                  }
                  title={
                    showPassword
                      ? "Sembunyikan password"
                      : "Lihat password"
                  }
                  className="
        absolute right-3 top-1/2
        flex h-9 w-9 -translate-y-1/2
        items-center justify-center
        rounded-lg text-gray-400
        transition
        hover:bg-gray-100
        hover:text-gray-700
        disabled:cursor-not-allowed
        disabled:opacity-50
        dark:text-gray-500
        dark:hover:bg-gray-800
        dark:hover:text-gray-300
      "
                >
                  {showPassword ? (
                    <EyeSlashIcon />
                  ) : (
                    <EyeIcon />
                  )}
                </button>
              </div>

              {!isEdit && (
                <p className="mt-2 text-xs text-gray-400">
                  Gunakan minimal 6 karakter.
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <input
                type="checkbox"
                checked={form.isActive}
                disabled={submitting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-brand-500"
              />

              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  User aktif
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  User aktif dapat masuk ke aplikasi.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={submitting || loadingOptions}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Tambah User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m6 9 6 6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="2.5"
      />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M3 3l18 18"
        strokeLinecap="round"
      />

      <path
        d="M10.6 6.2A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.1 3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M6.1 6.1C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9.7 9.7 0 0 0 3-.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}