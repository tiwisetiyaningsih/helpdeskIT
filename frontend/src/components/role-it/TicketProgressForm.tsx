"use client";

import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";
import React, {
  FormEvent,
  useEffect,
  useState,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Employee = {
  nik?: string;
  nama?: string;
  jabatan?: string;
  unitKerja?: string;
  jobTitle?: string | null;
};

type TicketUser = {
  id: number;
  email?: string;
  employee?: Employee | null;
};

type TicketEvidence = {
  id: number;
  originalName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  fileUrl?: string;
};

type Ticket = {
  id: number;
  noPelaporan: string;

  reporterId: number;
  handlerId: number | null;

  keluhan: string;
  priority: number;
  status: string;

  waktuKeluhan: string;

  kategoriKeluhan?: string | null;
  sla?: string | number | null;
  eskalasi?: string | null;

  batasResponse?: string | null;
  selesaiResponse?: string | null;
  keteranganResponse?: string | null;

  isPending?: boolean;
  lamaPending?: string | number | null;

  analisaAwal?: string | null;
  hasilAnalisa?: string | null;

  mulaiPengerjaan?: string | null;
  estimasiPengerjaan?: string | null;
  selesaiPengerjaan?: string | null;

  catatan?: string | null;
  keterangan?: string | null;

  reporter?: TicketUser | null;
  handler?: TicketUser | null;
  evidences?: TicketEvidence[];
};

type DetailResponse = {
  success?: boolean;
  message?: string;
  ticket?: Ticket;
};

type UpdateResponse = {
  success?: boolean;
  message?: string;
  ticket?: Ticket;
};

type FormData = {
  kategoriKeluhan: string;
  priority: string;
  sla: string;
  eskalasi: string;

  batasResponse: string;
  selesaiResponse: string;
  keteranganResponse: string;

  isPending: boolean;
  lamaPending: string;

  analisaAwal: string;
  hasilAnalisa: string;

  estimasiPengerjaan: string;
  selesaiPengerjaan: string;

  catatan: string;
  status: string;
  keterangan: string;
};

const initialForm: FormData = {
  kategoriKeluhan: "",
  priority: "4",
  sla: "",
  eskalasi: "",

  batasResponse: "",
  selesaiResponse: "",
  keteranganResponse: "",

  isPending: false,
  lamaPending: "",

  analisaAwal: "",
  hasilAnalisa: "",

  estimasiPengerjaan: "",
  selesaiPengerjaan: "",

  catatan: "",
  status: "IN_PROGRESS",
  keterangan: "",
};

async function parseJson<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get(
      "content-type"
    );

  if (
    !contentType?.includes(
      "application/json"
    )
  ) {
    throw new Error(
      "Backend tidak mengembalikan JSON."
    );
  }

  return response.json() as Promise<T>;
}

function toDateTimeLocal(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset * 60 * 1000
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Asia/Jakarta",
    }
  ).format(date);
}

function getStatusLabel(
  status?: string
) {
  const labels: Record<
    string,
    string
  > = {
    OPEN: "Open",
    IN_PROGRESS: "Diproses",
    PENDING: "Pending",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };

  return (
    labels[
      String(status || "")
        .toUpperCase()
    ] ||
    status ||
    "-"
  );
}

function getPriorityLabel(
  priority?: number
) {
  const labels: Record<
    number,
    string
  > = {
    1: "Sangat Tinggi",
    2: "Tinggi",
    3: "Sedang",
    4: "Rendah",
  };

  return priority
    ? labels[priority]
    : "-";
}

export default function TicketProgressForm() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const ticketId =
    params?.id;

  const [
    ticket,
    setTicket,
  ] =
    useState<Ticket | null>(
      null
    );

  const [form, setForm] =
    useState<FormData>(
      initialForm
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  useEffect(() => {
    const loadTicket =
      async () => {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          router.replace(
            "/signin"
          );
          return;
        }

        if (!ticketId) {
          setError(
            "ID ticket tidak ditemukan."
          );

          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError("");

          const response =
            await apiFetch(
              `${API_URL}/tickets/detail/${ticketId}`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  Accept:
                    "application/json",
                },

                cache: "no-store",
              }
            );

          const data =
            await parseJson<DetailResponse>(
              response
            );

          if (
            !response.ok ||
            !data.ticket
          ) {
            throw new Error(
              data.message ||
                "Gagal mengambil data ticket."
            );
          }

          const item =
            data.ticket;

          setTicket(item);

          setForm({
            kategoriKeluhan:
              item.kategoriKeluhan ||
              "",

            priority:
              String(
                item.priority || 4
              ),

            sla:
              item.sla
                ? String(item.sla)
                : "",

            eskalasi:
              item.eskalasi || "",

            batasResponse:
              toDateTimeLocal(
                item.batasResponse
              ),

            selesaiResponse:
              toDateTimeLocal(
                item.selesaiResponse
              ),

            keteranganResponse:
              item.keteranganResponse ||
              "",

            isPending:
              Boolean(
                item.isPending
              ),

            lamaPending:
              item.lamaPending
                ? String(
                    item.lamaPending
                  )
                : "",

            analisaAwal:
              item.analisaAwal ||
              "",

            hasilAnalisa:
              item.hasilAnalisa ||
              "",

            estimasiPengerjaan:
              toDateTimeLocal(
                item.estimasiPengerjaan
              ),

            selesaiPengerjaan:
              toDateTimeLocal(
                item.selesaiPengerjaan
              ),

            catatan:
              item.catatan || "",

            status:
              item.status ||
              "IN_PROGRESS",

            keterangan:
              item.keterangan || "",
          });
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Gagal memuat ticket."
          );
        } finally {
          setLoading(false);
        }
      };

    void loadTicket();
  }, [
    router,
    ticketId,
  ]);

  function updateField<
    K extends keyof FormData,
  >(
    key: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {
      setError(
        "Sesi login tidak ditemukan."
      );
      return;
    }

    if (
      !form.kategoriKeluhan
        .trim()
    ) {
      setError(
        "Kategori keluhan wajib dipilih."
      );
      return;
    }

    if (
      !form.analisaAwal.trim()
    ) {
      setError(
        "Analisa awal wajib diisi."
      );
      return;
    }

    if (
      form.status ===
        "PENDING" &&
      !form.lamaPending.trim()
    ) {
      setError(
        "Lama atau alasan pending wajib diisi."
      );
      return;
    }

    if (
      form.status ===
        "COMPLETED" &&
      !form.hasilAnalisa.trim()
    ) {
      setError(
        "Hasil analisa wajib diisi sebelum ticket diselesaikan."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response =
        await apiFetch(
          `${API_URL}/tickets/${ticketId}/progress`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`,

              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              kategoriKeluhan:
                form.kategoriKeluhan,

              priority:
                Number(
                  form.priority
                ),

              sla:
                form.sla || null,

              eskalasi:
                form.eskalasi ||
                null,

              batasResponse:
                form.batasResponse ||
                null,

              selesaiResponse:
                form.selesaiResponse ||
                null,

              keteranganResponse:
                form.keteranganResponse ||
                null,

              isPending:
                form.status ===
                  "PENDING" ||
                form.isPending,

              lamaPending:
                form.status ===
                  "PENDING"
                  ? form.lamaPending
                  : null,

              analisaAwal:
                form.analisaAwal,

              hasilAnalisa:
                form.hasilAnalisa ||
                null,

              estimasiPengerjaan:
                form.estimasiPengerjaan ||
                null,

              selesaiPengerjaan:
                form.status ===
                "COMPLETED"
                  ? form.selesaiPengerjaan ||
                    new Date()
                      .toISOString()
                  : form.selesaiPengerjaan ||
                    null,

              catatan:
                form.catatan ||
                null,

              status:
                form.status,

              keterangan:
                form.keterangan ||
                null,
            }),
          }
        );

      const data =
        await parseJson<UpdateResponse>(
          response
        );

      if (
        !response.ok ||
        !data.ticket
      ) {
        throw new Error(
          data.message ||
            "Gagal memperbarui ticket."
        );
      }

      setTicket(
        data.ticket
      );

      setSuccess(
        data.message ||
          "Progress ticket berhasil diperbarui."
      );

      if (
        data.ticket.status ===
        "COMPLETED"
      ) {
        window.setTimeout(
          () => {
            router.push(
              "/it-helpdesk/daily-work"
            );
          },
          1000
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui ticket."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          Memuat pekerjaan...
        </p>
      </div>
    );
  }

  if (
    error &&
    !ticket
  ) {
    return (
      <div className="space-y-5">
        <Link
          href="/it-helpdesk/daily-work"
          className="text-theme-sm font-semibold text-brand-500"
        >
          ← Kembali
        </Link>

        <div className="rounded-2xl border border-error-200 bg-error-50 p-5 text-error-700">
          {error}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const employee =
    ticket.reporter
      ?.employee;

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-7 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03] sm:px-8">
        <Link
          href="/it-helpdesk/daily-work"
          className="inline-flex text-theme-sm font-semibold text-brand-500 hover:text-brand-600"
        >
          ← Kembali ke Pekerjaan Harian
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-semibold text-brand-600">
              {ticket.noPelaporan}
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
              Lanjutkan Penanganan
            </h1>

            <p className="mt-2 text-theme-sm text-gray-500">
              Lengkapi analisa dan progress pekerjaan ticket.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge>
              {getStatusLabel(
                ticket.status
              )}
            </Badge>

            <Badge>
              {getPriorityLabel(
                ticket.priority
              )}
            </Badge>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-theme-sm text-error-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-success-200 bg-success-50 px-5 py-4 text-theme-sm text-success-700">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <SectionHeader
          title="Informasi Ticket"
          subtitle="Data pelapor dan keluhan pengguna."
        />

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
          <ReadOnlyItem
            label="Nama Pelapor"
            value={
              employee?.nama ||
              ticket.reporter?.email
            }
          />

          <ReadOnlyItem
            label="NIK"
            value={employee?.nik}
          />

          <ReadOnlyItem
            label="Jabatan"
            value={
              employee?.jabatan
            }
          />

          <ReadOnlyItem
            label="Unit Kerja"
            value={
              employee?.unitKerja
            }
          />

          <ReadOnlyItem
            label="Waktu Keluhan"
            value={formatDate(
              ticket.waktuKeluhan
            )}
          />

          <ReadOnlyItem
            label="Mulai Pengerjaan"
            value={formatDate(
              ticket.mulaiPengerjaan
            )}
          />
        </div>

        <div className="px-5 pb-6 sm:px-6">
          <ReadOnlyItem
            label="Keluhan"
            value={ticket.keluhan}
            multiline
          />
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <SectionHeader
            title="Klasifikasi dan Analisa"
            subtitle="Tentukan kategori, SLA, dan hasil pemeriksaan."
          />

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <FormSelect
              label="Kategori Keluhan"
              required
              value={
                form.kategoriKeluhan
              }
              onChange={(value) =>
                updateField(
                  "kategoriKeluhan",
                  value
                )
              }
              options={[
                {
                  value: "",
                  label:
                    "Pilih kategori",
                },
                {
                  value: "Hardware",
                  label: "Hardware",
                },
                {
                  value: "Software",
                  label: "Software",
                },
                {
                  value: "Jaringan",
                  label: "Jaringan",
                },
                {
                  value: "Printer",
                  label: "Printer",
                },
                {
                  value: "Email",
                  label: "Email",
                },
                {
                  value: "Aplikasi",
                  label: "Aplikasi",
                },
                {
                  value: "Akun dan Akses",
                  label:
                    "Akun dan Akses",
                },
                {
                  value: "Lainnya",
                  label: "Lainnya",
                },
              ]}
            />

            <FormSelect
              label="Priority"
              required
              value={form.priority}
              onChange={(value) =>
                updateField(
                  "priority",
                  value
                )
              }
              options={[
                {
                  value: "1",
                  label:
                    "Sangat Tinggi",
                },
                {
                  value: "2",
                  label: "Tinggi",
                },
                {
                  value: "3",
                  label: "Sedang",
                },
                {
                  value: "4",
                  label: "Rendah",
                },
              ]}
            />

            <FormInput
              label="SLA"
              value={form.sla}
              placeholder="Contoh: 4 Jam"
              onChange={(value) =>
                updateField(
                  "sla",
                  value
                )
              }
            />

            <FormInput
              label="Eskalasi"
              value={
                form.eskalasi
              }
              placeholder="Contoh: Network Engineer"
              onChange={(value) =>
                updateField(
                  "eskalasi",
                  value
                )
              }
            />

            <div className="sm:col-span-2">
              <FormTextarea
                label="Analisa Awal"
                required
                value={
                  form.analisaAwal
                }
                placeholder="Tuliskan hasil pemeriksaan awal..."
                onChange={(value) =>
                  updateField(
                    "analisaAwal",
                    value
                  )
                }
              />
            </div>

            <div className="sm:col-span-2">
              <FormTextarea
                label="Hasil Analisa"
                value={
                  form.hasilAnalisa
                }
                placeholder="Tuliskan hasil analisa akhir..."
                onChange={(value) =>
                  updateField(
                    "hasilAnalisa",
                    value
                  )
                }
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <SectionHeader
            title="Progress Pengerjaan"
            subtitle="Perbarui status, estimasi, dan catatan pekerjaan."
          />

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <FormSelect
              label="Status"
              required
              value={form.status}
              onChange={(value) => {
                updateField(
                  "status",
                  value
                );

                updateField(
                  "isPending",
                  value ===
                    "PENDING"
                );
              }}
              options={[
                {
                  value:
                    "IN_PROGRESS",
                  label: "Diproses",
                },
                {
                  value: "PENDING",
                  label: "Pending",
                },
                {
                  value:
                    "COMPLETED",
                  label: "Selesai",
                },
                {
                  value:
                    "CANCELLED",
                  label: "Dibatalkan",
                },
              ]}
            />

            <FormInput
              type="datetime-local"
              label="Estimasi Pengerjaan"
              value={
                form.estimasiPengerjaan
              }
              onChange={(value) =>
                updateField(
                  "estimasiPengerjaan",
                  value
                )
              }
            />

            <FormInput
              type="datetime-local"
              label="Batas Response"
              value={
                form.batasResponse
              }
              onChange={(value) =>
                updateField(
                  "batasResponse",
                  value
                )
              }
            />

            <FormInput
              type="datetime-local"
              label="Selesai Response"
              value={
                form.selesaiResponse
              }
              onChange={(value) =>
                updateField(
                  "selesaiResponse",
                  value
                )
              }
            />

            {form.status ===
              "PENDING" && (
              <div className="sm:col-span-2">
                <FormInput
                  label="Alasan / Lama Pending"
                  required
                  value={
                    form.lamaPending
                  }
                  placeholder="Contoh: Menunggu sparepart, estimasi 2 hari"
                  onChange={(value) =>
                    updateField(
                      "lamaPending",
                      value
                    )
                  }
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <FormTextarea
                label="Catatan Pengerjaan"
                value={
                  form.catatan
                }
                placeholder="Tuliskan tindakan yang sudah dilakukan..."
                onChange={(value) =>
                  updateField(
                    "catatan",
                    value
                  )
                }
              />
            </div>
          </div>
        </section>

        {form.status ===
          "COMPLETED" && (
          <section className="rounded-2xl border border-success-200 bg-white shadow-theme-xs dark:border-success-500/20 dark:bg-white/[0.03]">
            <SectionHeader
              title="Penyelesaian Ticket"
              subtitle="Lengkapi informasi akhir sebelum menyelesaikan ticket."
            />

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <FormInput
                type="datetime-local"
                label="Selesai Pengerjaan"
                value={
                  form.selesaiPengerjaan
                }
                onChange={(value) =>
                  updateField(
                    "selesaiPengerjaan",
                    value
                  )
                }
              />

              <div />

              <div className="sm:col-span-2">
                <FormTextarea
                  label="Keterangan Response"
                  value={
                    form.keteranganResponse
                  }
                  placeholder="Tuliskan response atau solusi yang diberikan kepada pengguna..."
                  onChange={(value) =>
                    updateField(
                      "keteranganResponse",
                      value
                    )
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <FormTextarea
                  label="Keterangan Akhir"
                  value={
                    form.keterangan
                  }
                  placeholder="Tuliskan keterangan akhir penyelesaian..."
                  onChange={(value) =>
                    updateField(
                      "keterangan",
                      value
                    )
                  }
                />
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/it-helpdesk/daily-work"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700"
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={saving}
            className={`inline-flex h-11 items-center justify-center rounded-lg px-5 text-theme-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              form.status ===
              "COMPLETED"
                ? "bg-success-600 hover:bg-success-700"
                : "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {saving
              ? "Menyimpan..."
              : form.status ===
                  "COMPLETED"
                ? "Selesaikan Ticket"
                : "Simpan Progress"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-brand-50 px-3 py-1.5 text-theme-sm font-semibold text-brand-600">
      {children}
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
      <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
        {title}
      </h2>

      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        {subtitle}
      </p>
    </div>
  );
}

function ReadOnlyItem({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1.5 text-theme-sm font-semibold text-gray-700 dark:text-gray-300 ${
          multiline
            ? "whitespace-pre-line leading-7"
            : "break-words"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}

        {required && (
          <span className="text-error-500">
            {" "}*
          </span>
        )}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-theme-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
    </label>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}

        {required && (
          <span className="text-error-500">
            {" "}*
          </span>
        )}
      </span>

      <textarea
        value={value}
        required={required}
        rows={5}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-theme-sm leading-6 text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  options: {
    value: string;
    label: string;
  }[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}

        {required && (
          <span className="text-error-500">
            {" "}*
          </span>
        )}
      </span>

      <select
        value={value}
        required={required}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-theme-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      >
        {options.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          )
        )}
      </select>
    </label>
  );
}