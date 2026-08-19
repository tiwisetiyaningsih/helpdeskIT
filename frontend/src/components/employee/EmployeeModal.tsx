"use client";

import { useEffect, useState } from "react";
import {
  createEmployee,
  updateEmployee,
} from "@/services/employee.service";
import {
  POSITION_OPTIONS,
  UNIT_KERJA_OPTIONS,
  JOB_TITLE_OPTIONS,
  STATUS_OPTIONS,
} from "./employee-options";
import SearchableSelect from "@/components/common/SearchableSelect";

type Employee = {
  id: number;
  nik: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jobTitle?: string | null;
  isActive: boolean;
};

type EmployeeModalProps = {
  isOpen: boolean;
  employee?: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
};

type FormData = {
  nik: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jobTitle: string;
  isActive: boolean;
};

const initialForm: FormData = {
  nik: "",
  nama: "",
  jabatan: "",
  unitKerja: "",
  jobTitle: "",
  isActive: true,
};

export default function EmployeeModal({
  isOpen,
  employee,
  onClose,
  onSuccess,
}: EmployeeModalProps) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(employee);

  useEffect(() => {
    if (employee) {
      setForm({
        nik: employee.nik,
        nama: employee.nama,
        jabatan: employee.jabatan,
        unitKerja: employee.unitKerja,
        jobTitle: employee.jobTitle || "",
        isActive: employee.isActive,
      });
    } else {
      setForm(initialForm);
    }

    setError("");
  }, [employee, isOpen]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setForm((previous) => ({
      ...previous,
      isActive: event.target.value === "true",
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (
      !form.nik.trim() ||
      !form.nama.trim() ||
      !form.jabatan.trim() ||
      !form.unitKerja.trim()
    ) {
      setError("NIK, nama, jabatan, dan unit kerja wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nik: form.nik.trim(),
        nama: form.nama.trim(),
        jabatan: form.jabatan.trim(),
        unitKerja: form.unitKerja.trim(),
        jobTitle: form.jobTitle.trim() || null,
        isActive: form.isActive,
      };

      const result = isEdit
        ? await updateEmployee(employee!.id, payload)
        : await createEmployee(payload);

      if (!result.success) {
        throw new Error(result.message || "Gagal menyimpan employee.");
      }

      onSuccess();
      onClose();
      setForm(initialForm);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Terjadi kesalahan saat menyimpan employee.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEdit ? "Edit Employee" : "Tambah Employee"}
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isEdit
                ? "Perbarui data employee."
                : "Tambahkan data employee baru."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                NIK
              </label>

              <input
                type="text"
                name="nik"
                value={form.nik}
                onChange={handleChange}
                placeholder="Masukkan NIK"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nama
              </label>

              <input
                type="text"
                name="nama"
                value={form.nama}
                onChange={handleChange}
                placeholder="Masukkan nama"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
              />
            </div>

            {/* <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Position
              </label>

              <input
                type="text"
                name="jabatan"
                value={form.jabatan}
                onChange={handleChange}
                placeholder="Masukkan jabatan"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
              />
            </div> */}

            {/* <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unit Kerja
              </label>
              <select
                name="unitKerja"
                value={form.unitKerja}
                onChange={handleChange}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-4 pr-10 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">Pilih unit kerja</option>

                {UNIT_KERJA_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div> */}

            {/* <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Job Title
              </label>

              <input
                type="text"
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                placeholder="Masukkan job title"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"
              />
            </div> */}
            <SearchableSelect
              label="Position"
              placeholder="Pilih position"
              options={POSITION_OPTIONS}
              value={form.jabatan}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  jabatan: value,
                }))
              }
            />

            <SearchableSelect
              label="Unit Kerja"
              placeholder="Pilih unit kerja"
              options={UNIT_KERJA_OPTIONS}
              value={form.unitKerja}
              searchable
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  unitKerja: value,
                }))
              }
            />

            <SearchableSelect
              label="Job Title"
              placeholder="Pilih job title"
              options={JOB_TITLE_OPTIONS}
              value={form.jobTitle}
              searchable
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  jobTitle: value,
                }))
              }
            />

            {/* <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>

              <select
                value={String(form.isActive)}
                onChange={handleStatusChange}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div> */}

            <SearchableSelect
              label="Status"
              value={form.isActive ? "Aktif" : "Nonaktif"}
              options={STATUS_OPTIONS}
              placeholder="Pilih status"
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  isActive: value === "Aktif",
                }))
              }
            />

            {error && (
              <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}