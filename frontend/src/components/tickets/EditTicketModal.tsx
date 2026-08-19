"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Ticket,
  TicketUser,
} from "@/services/ticket.service";
import { apiFetch } from "@/lib/apiFetch";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

const CATEGORY_OPTIONS = [
  "Jaringan",
  "Aplikasi",
  "Data Center",
  "Printer",
  "Laptop/PC",
  "Email",
  "Layanan",
];

const STATUS_OPTIONS = [
  {
    value: "OPEN",
    label: "Open",
  },
  {
    value: "ON_GOING",
    label: "On Going",
  },
  {
    value: "PENDING",
    label: "Pending",
  },
  {
    value: "COMPLETED",
    label: "Completed",
  },
  {
    value: "CANCELLED",
    label: "Dibatalkan",
  },
];

type EditTicketModalProps = {
  ticket: Ticket;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

type ItHelpdeskUser = TicketUser & {
  employee?: {
    id?: number;
    nama?: string;
    nik?: string;
    jabatan?: string;
    unitKerja?: string;
    jobTitle?: string | null;
  } | null;
};

type ItHelpdeskResponse = {
  success?: boolean;
  message?: string;
  users?: ItHelpdeskUser[];
};

type UpdateResponse = {
  success?: boolean;
  message?: string;
  ticket?: Ticket;
};

type EditTicketForm = {
  kategoriKeluhan: string;
  priority: string;
  sla: string;
  handlerId: string;
  eskalasi: string;

  status: string;

  isPending: boolean;
  lamaPending: string;

  mulaiPengerjaan: string;
  selesaiPengerjaan: string;

  selesaiResponse: string;
  keteranganResponse: string;

  analisaAwal: string;
  hasilAnalisa: string;

  catatan: string;
  keterangan: string;
};

function normalizeStatus(status?: string) {
  const normalized = String(
    status || "OPEN"
  )
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");

  if (normalized === "IN_PROGRESS") {
    return "ON_GOING";
  }

  if (normalized === "WAITING") {
    return "OPEN";
  }

  return normalized;
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

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
      timeZone: "Asia/Jakarta",
    }
  ).format(date);
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

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function toIsoString(
  value?: string
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date.toISOString();
}

function getStatusLabel(
  status?: string
) {
  const labels: Record<
    string,
    string
  > = {
    MASUK: "Masuk",
    OPEN: "Open",
    ON_GOING: "On Going",
    PENDING: "Pending",
    COMPLETED: "Completed",
    CANCELLED: "Dibatalkan",
  };

  return (
    labels[
      normalizeStatus(status)
    ] ||
    status ||
    "-"
  );
}

function getStatusClass(
  status?: string
) {
  switch (
    normalizeStatus(status)
  ) {
    case "MASUK":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

    case "OPEN":
      return "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400";

    case "ON_GOING":
      return "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";

    case "PENDING":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";

    case "COMPLETED":
      return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";

    case "CANCELLED":
      return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getPriorityLabel(
  priority?: number | string | null
) {
  const labels: Record<
    string,
    string
  > = {
    "1": "1 - Sangat Tinggi (Direksi)",
    "2": "2 - Tinggi (VP/EVP)",
    "3": "3 - Sedang (Manager)",
    "4": "4 - Rendah (Staff)",
  };

  return (
    labels[String(priority || "")] ||
    "Belum ditentukan"
  );
}

function calculateAutomaticDates(
  waktuKeluhan: string,
  slaValue: string,
  lamaPendingValue: string
) {
  const baseDate =
    new Date(waktuKeluhan);

  const slaHours =
    Number(slaValue);

  const pendingMinutes =
    Number(lamaPendingValue || 0);

  if (
    Number.isNaN(
      baseDate.getTime()
    ) ||
    !Number.isFinite(slaHours) ||
    slaHours <= 0
  ) {
    return {
      batasResponse: null,
      estimasiPengerjaan: null,
    };
  }

  const slaMilliseconds =
    slaHours *
    60 *
    60 *
    1000;

  const pendingMilliseconds =
    Math.max(
      pendingMinutes,
      0
    ) *
    60 *
    1000;

  return {
    batasResponse: new Date(
      baseDate.getTime() +
        slaMilliseconds
    ),

    estimasiPengerjaan:
      new Date(
        baseDate.getTime() +
          slaMilliseconds +
          pendingMilliseconds
      ),
  };
}

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
    const responseText =
      await response.text();

    console.error(
      "Response backend:",
      responseText
    );

    throw new Error(
      "Backend tidak mengembalikan JSON."
    );
  }

  return response.json() as Promise<T>;
}

export default function EditTicketModal({
  ticket,
  onClose,
  onSuccess,
}: EditTicketModalProps) {
  const employee =
    ticket.reporter?.employee ||
    ticket.employee;

  const [
    itUsers,
    setItUsers,
  ] = useState<
    ItHelpdeskUser[]
  >([]);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    form,
    setForm,
  ] =
    useState<EditTicketForm>({
      kategoriKeluhan:
        ticket.kategoriKeluhan ||
        "",

      priority:
        String(
          ticket.priority || ""
        ),

      sla:
        ticket.sla !== null &&
        ticket.sla !== undefined
          ? String(ticket.sla)
          : "",

      handlerId:
        ticket.handlerId
          ? String(
              ticket.handlerId
            )
          : "",

      eskalasi:
        ticket.eskalasi || "",

      status:
        normalizeStatus(
          ticket.status
        ),

      isPending:
        Boolean(
          ticket.isPending
        ),

      lamaPending:
        ticket.lamaPending !==
          null &&
        ticket.lamaPending !==
          undefined
          ? String(
              ticket.lamaPending
            )
          : "0",

      mulaiPengerjaan:
        toDateTimeLocal(
          ticket.mulaiPengerjaan
        ),

      selesaiPengerjaan:
        toDateTimeLocal(
          ticket.selesaiPengerjaan
        ),

      selesaiResponse:
        ticket.selesaiResponse ||
        "",

      keteranganResponse:
        ticket.keteranganResponse ||
        "",

      analisaAwal:
        ticket.analisaAwal || "",

      hasilAnalisa:
        ticket.hasilAnalisa || "",

      catatan:
        ticket.catatan || "",

      keterangan:
        ticket.keterangan || "",
    });

  useEffect(() => {
    async function loadItUsers() {
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

      try {
        setLoadingUsers(true);

        const response =
          await apiFetch(
            `${API_URL}/tickets/it-helpdesk-users`,
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
          await parseJson<ItHelpdeskResponse>(
            response
          );

        if (
          !response.ok ||
          data.success === false
        ) {
          throw new Error(
            data.message ||
              "Gagal mengambil daftar IT HelpDesk."
          );
        }

        setItUsers(
          Array.isArray(data.users)
            ? data.users
            : []
        );
      } catch (
        loadError: unknown
      ) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal mengambil daftar IT HelpDesk."
        );
      } finally {
        setLoadingUsers(false);
      }
    }

    void loadItUsers();
  }, []);

  useEffect(() => {
    const normalizedStatus =
      normalizeStatus(
        form.status
      );

    if (
      normalizedStatus ===
      "PENDING"
    ) {
      setForm((previous) => ({
        ...previous,
        isPending: true,
      }));

      return;
    }

    if (
      normalizedStatus !==
      "PENDING" &&
      form.isPending
    ) {
      setForm((previous) => ({
        ...previous,
        isPending: false,
        lamaPending: "0",
      }));
    }
  }, [form.status]);

  const automaticDates =
    useMemo(
      () =>
        calculateAutomaticDates(
          ticket.waktuKeluhan,
          form.sla,
          form.isPending
            ? form.lamaPending
            : "0"
        ),
      [
        ticket.waktuKeluhan,
        form.sla,
        form.isPending,
        form.lamaPending,
      ]
    );

  const selectedHandler =
    useMemo(
      () =>
        itUsers.find(
          (user) =>
            String(user.id) ===
            form.handlerId
        ),
      [
        itUsers,
        form.handlerId,
      ]
    );

  const selectedHandlerName =
    selectedHandler?.employee
      ?.nama ||
    selectedHandler?.email ||
    ticket.handler?.employee
      ?.nama ||
    ticket.handler?.email ||
    "Belum ditugaskan";

  function updateField<
    Key extends keyof EditTicketForm,
  >(
    field: Key,
    value: EditTicketForm[Key]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function submitEdit(
    event: React.FormEvent<HTMLFormElement>
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

    const priority =
      Number(form.priority);

    const sla =
      Number(form.sla);

    const lamaPending =
      Number(
        form.lamaPending || 0
      );

    if (
      !form.kategoriKeluhan
    ) {
      setError(
        "Kategori keluhan wajib dipilih."
      );

      return;
    }

    if (
      ![1, 2, 3, 4].includes(
        priority
      )
    ) {
      setError(
        "Priority tidak valid."
      );

      return;
    }

    if (
      !Number.isInteger(sla) ||
      sla <= 0
    ) {
      setError(
        "SLA harus berupa jumlah jam lebih dari 0."
      );

      return;
    }

    if (
      form.isPending &&
      (
        !Number.isFinite(
          lamaPending
        ) ||
        lamaPending < 0
      )
    ) {
      setError(
        "Lama pending tidak valid."
      );

      return;
    }

    if (
      !form.handlerId
    ) {
      setError(
        "Handler IT HelpDesk wajib dipilih."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      const response =
        await apiFetch(
          `${API_URL}/tickets/${ticket.id}/progress`,
          {
            method: "PATCH",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              handlerId:
                Number(
                  form.handlerId
                ),

              kategoriKeluhan:
                form.kategoriKeluhan,

              priority,

              sla,

              eskalasi:
                selectedHandlerName ===
                "Belum ditugaskan"
                  ? null
                  : selectedHandlerName,

              batasResponse:
                automaticDates
                  .batasResponse
                  ?.toISOString() ||
                null,

              estimasiPengerjaan:
                automaticDates
                  .estimasiPengerjaan
                  ?.toISOString() ||
                null,

              selesaiResponse:
                form.selesaiResponse
                  .trim() ||
                null,

              keteranganResponse:
                form.keteranganResponse
                  .trim() ||
                null,

              status:
                normalizeStatus(
                  form.status
                ),

              isPending:
                form.isPending,

              lamaPending:
                form.isPending
                  ? lamaPending
                  : null,

              mulaiPengerjaan:
                toIsoString(
                  form.mulaiPengerjaan
                ),

              selesaiPengerjaan:
                toIsoString(
                  form.selesaiPengerjaan
                ),

              analisaAwal:
                form.analisaAwal
                  .trim() ||
                null,

              hasilAnalisa:
                form.hasilAnalisa
                  .trim() ||
                null,

              catatan:
                form.catatan.trim() ||
                null,

              keterangan:
                form.keterangan
                  .trim() ||
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
        data.success === false
      ) {
        throw new Error(
          data.message ||
            "Gagal memperbarui ticket."
        );
      }

      await onSuccess();
      onClose();
    } catch (
      updateError: unknown
    ) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Gagal memperbarui ticket."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={onClose}
    >
      <form
        onSubmit={submitEdit}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
      >
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <EditTicketIcon />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Ticket
                </h2>

                <StatusBadge
                  status={form.status}
                />
              </div>

              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                Perbarui informasi
                penugasan, SLA, response,
                pengerjaan, dan status
                ticket.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[390px_minmax(0,1fr)] sm:p-6">
            {/* Kolom kiri */}
            <div className="space-y-4">
              <SectionCard
                title="Informasi Pelaporan"
                subtitle="Tidak dapat diubah"
                icon={<LockIcon />}
              >
                <div className="grid grid-cols-1 gap-x-5 gap-y-0 sm:grid-cols-2 lg:grid-cols-2">
                  <ReadonlyItem
                    label="Nomor Pelaporan"
                    value={
                      ticket.noPelaporan
                    }
                  />

                  <ReadonlyItem
                    label="Status Saat Ini"
                    value={getStatusLabel(
                      ticket.status
                    )}
                    status={
                      ticket.status
                    }
                  />

                  <ReadonlyItem
                    label="Waktu Keluhan"
                    value={formatDateTime(
                      ticket.waktuKeluhan
                    )}
                    full
                  />

                  <ReadonlyItem
                    label="NIK"
                    value={
                      employee?.nik || "-"
                    }
                  />

                  <ReadonlyItem
                    label="Nama Pelapor"
                    value={
                      employee?.nama ||
                      ticket.reporter
                        ?.email ||
                      "-"
                    }
                  />

                  <ReadonlyItem
                    label="Jabatan"
                    value={
                      employee?.jabatan ||
                      "-"
                    }
                  />

                  <ReadonlyItem
                    label="Job Title"
                    value={
                      employee?.jobTitle ||
                      "-"
                    }
                  />

                  <ReadonlyItem
                    label="Unit Kerja"
                    value={
                      employee?.unitKerja ||
                      "-"
                    }
                  />

                  <ReadonlyItem
                    label="Email"
                    value={
                      ticket.reporter
                        ?.email || "-"
                    }
                  />

                  <ReadonlyItem
                    label="PIC Saat Ini"
                    value={
                      ticket.handler
                        ?.employee?.nama ||
                      ticket.handler
                        ?.email ||
                      "Belum ditugaskan"
                    }
                  />

                  <ReadonlyItem
                    label="Nomor Pelapor"
                    value={
                      ticket.noPelaporan
                    }
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Keluhan"
                subtitle="Tidak dapat diubah"
                icon={<LockIcon />}
              >
                <p className="mb-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Deskripsi Keluhan
                </p>

                <div className="min-h-28 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-theme-sm leading-6 text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  {ticket.keluhan ||
                    "Keluhan tidak tersedia."}
                </div>
              </SectionCard>
            </div>

            {/* Kolom kanan */}
            <div className="space-y-4">
              {error && (
                <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-theme-sm font-medium text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                  {error}
                </div>
              )}

              <SectionCard
                title="Informasi Penugasan & Progress"
                icon={
                  <AssignmentIcon />
                }
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField
                    label="Kategori Keluhan"
                    required
                  >
                    <div className="relative">
                      <select
                        value={
                          form.kategoriKeluhan
                        }
                        disabled={saving}
                        required
                        onChange={(event) =>
                          updateField(
                            "kategoriKeluhan",
                            event.target
                              .value
                          )
                        }
                        className={`${inputClass} appearance-none pr-11`}
                      >
                        <option value="">
                          Pilih kategori
                        </option>

                        {CATEGORY_OPTIONS.map(
                          (category) => (
                            <option
                              key={
                                category
                              }
                              value={
                                category
                              }
                            >
                              {category}
                            </option>
                          )
                        )}
                      </select>

                      <SelectArrow />
                    </div>
                  </FormField>

                  <FormField
                    label="Priority"
                    required
                  >
                    <div className="relative">
                      <select
                        value={
                          form.priority
                        }
                        disabled={saving}
                        required
                        onChange={(event) =>
                          updateField(
                            "priority",
                            event.target
                              .value
                          )
                        }
                        className={`${inputClass} appearance-none pr-11`}
                      >
                        <option value="1">
                          1 - Sangat Tinggi
                          (Direksi)
                        </option>

                        <option value="2">
                          2 - Tinggi
                          (VP/EVP)
                        </option>

                        <option value="3">
                          3 - Sedang
                          (Manager)
                        </option>

                        <option value="4">
                          4 - Rendah
                          (Staff)
                        </option>
                      </select>

                      <SelectArrow />
                    </div>
                  </FormField>

                  <FormField
                    label="SLA"
                    required
                  >
                    <div className="flex">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={form.sla}
                        disabled={saving}
                        required
                        onChange={(event) =>
                          updateField(
                            "sla",
                            event.target
                              .value
                          )
                        }
                        className={`${inputClass} rounded-r-none`}
                      />

                      <span className="inline-flex h-11 items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-4 text-theme-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                        Jam
                      </span>
                    </div>
                  </FormField>

                  <FormField label="Status Ticket">
                    <div className="relative">
                      <select
                        value={form.status}
                        disabled={saving}
                        onChange={(event) =>
                          updateField(
                            "status",
                            event.target
                              .value
                          )
                        }
                        className={`${inputClass} appearance-none pr-11`}
                      >
                        {STATUS_OPTIONS.map(
                          (status) => (
                            <option
                              key={
                                status.value
                              }
                              value={
                                status.value
                              }
                            >
                              {status.label}
                            </option>
                          )
                        )}
                      </select>

                      <SelectArrow />
                    </div>
                  </FormField>

                  <FormField
                    label="Handler / IT HelpDesk"
                    required
                  >
                    <div className="relative">
                      <select
                        value={
                          form.handlerId
                        }
                        disabled={
                          saving ||
                          loadingUsers
                        }
                        required
                        onChange={(event) =>
                          updateField(
                            "handlerId",
                            event.target
                              .value
                          )
                        }
                        className={`${inputClass} appearance-none pr-11`}
                      >
                        <option value="">
                          {loadingUsers
                            ? "Memuat petugas..."
                            : "Pilih IT HelpDesk"}
                        </option>

                        {itUsers.map(
                          (user) => (
                            <option
                              key={
                                user.id
                              }
                              value={
                                user.id
                              }
                            >
                              {user.employee
                                ?.nama ||
                                user.email ||
                                `User ${user.id}`}
                              {user.employee
                                ?.jobTitle
                                ? ` — ${user.employee.jobTitle}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>

                      <SelectArrow />
                    </div>
                  </FormField>

                  <FormField label="Eskalasi">
                    <input
                      type="text"
                      value={
                        selectedHandlerName
                      }
                      readOnly
                      className={`${inputClass} cursor-not-allowed bg-gray-50 dark:bg-gray-800`}
                    />
                  </FormField>

                  <FormField
                    label="Batas Response"
                    required
                  >
                    <AutomaticField
                      value={
                        automaticDates
                          .batasResponse
                          ? formatDateTime(
                              automaticDates.batasResponse.toISOString()
                            )
                          : "Isi SLA terlebih dahulu"
                      }
                    />
                  </FormField>

                  <FormField label="Estimasi Pengerjaan">
                    <AutomaticField
                      value={
                        automaticDates
                          .estimasiPengerjaan
                          ? formatDateTime(
                              automaticDates.estimasiPengerjaan.toISOString()
                            )
                          : "Isi SLA terlebih dahulu"
                      }
                    />
                  </FormField>
                </div>

                <div className="mt-5">
                  <ProgressSla
                    ticket={ticket}
                    calculatedDeadline={
                      automaticDates.batasResponse
                    }
                  />
                </div>
              </SectionCard>


              <SectionCard
                title="Informasi Response"
                icon={<ResponseIcon />}
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField label="Selesai Response">
                    <textarea
                      rows={3}
                      value={
                        form.selesaiResponse
                      }
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "selesaiResponse",
                          event.target
                            .value
                        )
                      }
                      placeholder="Tuliskan hasil response awal..."
                      className={textareaClass}
                    />
                  </FormField>

                  <FormField label="Keterangan Response">
                    <textarea
                      rows={3}
                      value={
                        form.keteranganResponse
                      }
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "keteranganResponse",
                          event.target
                            .value
                        )
                      }
                      placeholder="Tuliskan keterangan response..."
                      className={textareaClass}
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard
                title="Analisa dan Penyelesaian"
                icon={<AnalysisIcon />}
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <FormField label="Analisa Awal">
                    <textarea
                      rows={3}
                      value={
                        form.analisaAwal
                      }
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "analisaAwal",
                          event.target
                            .value
                        )
                      }
                      placeholder="Tuliskan analisa awal..."
                      className={textareaClass}
                    />
                  </FormField>

                  <FormField label="Hasil Analisa">
                    <textarea
                      rows={3}
                      value={
                        form.hasilAnalisa
                      }
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "hasilAnalisa",
                          event.target
                            .value
                        )
                      }
                      placeholder="Tuliskan hasil analisa..."
                      className={textareaClass}
                    />
                  </FormField>

                  <FormField label="Catatan">
                    <textarea
                      rows={3}
                      value={form.catatan}
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "catatan",
                          event.target
                            .value
                        )
                      }
                      placeholder="Catatan tambahan..."
                      className={textareaClass}
                    />
                  </FormField>

                  <FormField label="Keterangan">
                    <textarea
                      rows={3}
                      value={
                        form.keterangan
                      }
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "keterangan",
                          event.target
                            .value
                        )
                      }
                      placeholder="Keterangan tambahan..."
                      className={textareaClass}
                    />
                  </FormField>
                </div>
              </SectionCard>

              <SectionCard
                title="Informasi Pengerjaan"
                icon={<WorkIcon />}
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <FormField label="Mulai Pengerjaan">
                    <input
                      type="datetime-local"
                      value={
                        form.mulaiPengerjaan
                      }
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "mulaiPengerjaan",
                          event.target
                            .value
                        )
                      }
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Selesai Pengerjaan">
                    <input
                      type="datetime-local"
                      value={
                        form.selesaiPengerjaan
                      }
                      disabled={saving}
                      onChange={(event) =>
                        updateField(
                          "selesaiPengerjaan",
                          event.target
                            .value
                        )
                      }
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Status Pending">
                    <div className="relative">
                      <select
                        value={
                          form.isPending
                            ? "YES"
                            : "NO"
                        }
                        disabled={saving}
                        onChange={(event) =>
                          updateField(
                            "isPending",
                            event.target
                              .value ===
                              "YES"
                          )
                        }
                        className={`${inputClass} appearance-none pr-11`}
                      >
                        <option value="NO">
                          Tidak
                        </option>

                        <option value="YES">
                          Ya
                        </option>
                      </select>

                      <SelectArrow />
                    </div>
                  </FormField>

                  <FormField label="Lama Pending">
                    <div className="flex">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={
                          form.lamaPending
                        }
                        disabled={
                          saving ||
                          !form.isPending
                        }
                        onChange={(event) =>
                          updateField(
                            "lamaPending",
                            event.target
                              .value
                          )
                        }
                        className={`${inputClass} rounded-r-none`}
                      />

                      <span className="inline-flex h-11 items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-theme-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                        Menit
                      </span>
                    </div>
                  </FormField>

                  <FormField label="Sumber Priority">
                    <AutomaticField
                      value={getPriorityLabel(
                        form.priority
                      )}
                      icon={false}
                    />
                  </FormField>

                  <FormField label="Petugas Terpilih">
                    <AutomaticField
                      value={
                        selectedHandlerName
                      }
                      icon={false}
                    />
                  </FormField>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 min-w-[175px] items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}

            {saving
              ? "Menyimpan..."
              : "Simpan Perubahan"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {icon}
          </div>
        )}

        <h3 className="text-theme-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
          {title}
        </h3>

        {subtitle && (
          <>
            <span className="text-theme-xs text-gray-400">
              ({subtitle})
            </span>

            <span className="text-gray-400">
              <LockIcon />
            </span>
          </>
        )}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function ReadonlyItem({
  label,
  value,
  full = false,
  status,
}: {
  label: string;
  value: string;
  full?: boolean;
  status?: string;
}) {
  return (
    <div
      className={`border-b border-gray-100 py-4 dark:border-gray-800 ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
        {label}
      </p>

      {status ? (
        <div className="mt-2">
          <StatusBadge
            status={status}
          />
        </div>
      ) : (
        <p className="mt-2 break-words text-theme-sm font-semibold leading-5 text-gray-800 dark:text-white/90">
          {value}
        </p>
      )}
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
        {label}

        {required && (
          <span className="ml-1 text-error-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function AutomaticField({
  value,
  icon = true,
}: {
  value: string;
  icon?: boolean;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 dark:border-gray-800 dark:bg-gray-800">
      {icon && (
        <span className="shrink-0 text-gray-500">
          <CalendarIcon />
        </span>
      )}

      <span className="break-words text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </span>
    </div>
  );
}

function ProgressSla({
  ticket,
  calculatedDeadline,
}: {
  ticket: Ticket;
  calculatedDeadline: Date | null;
}) {
  const start =
    new Date(
      ticket.waktuKeluhan
    ).getTime();

  const deadline =
    calculatedDeadline?.getTime();

  if (
    !deadline ||
    Number.isNaN(start)
  ) {
    return (
      <div>
        <p className="text-theme-xs font-semibold text-gray-600">
          Progress SLA
        </p>

        <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800" />

        <p className="mt-2 text-[11px] text-gray-400">
          Isi SLA untuk menghitung
          progress.
        </p>
      </div>
    );
  }

  const now = Date.now();

  const totalDuration =
    Math.max(
      deadline - start,
      1
    );

  const elapsed =
    Math.max(now - start, 0);

  const percentage =
    Math.min(
      100,
      Math.max(
        2,
        (elapsed /
          totalDuration) *
          100
      )
    );

  const difference =
    deadline - now;

  const absoluteMinutes =
    Math.ceil(
      Math.abs(difference) /
        60000
    );

  const hours =
    Math.floor(
      absoluteMinutes / 60
    );

  const minutes =
    absoluteMinutes % 60;

  const durationText = `${
    hours > 0
      ? `${hours} jam `
      : ""
  }${minutes} menit`;

  const isLate =
    difference < 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-theme-xs font-semibold text-gray-600 dark:text-gray-300">
          Progress SLA
        </p>

        <p className="text-theme-xs font-bold text-brand-600">
          {Math.round(
            percentage
          )}
          %
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full ${
            isLate
              ? "bg-error-500"
              : percentage >= 80
                ? "bg-warning-500"
                : "bg-success-500"
          }`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <p
        className={`mt-2 text-[11px] font-medium ${
          isLate
            ? "text-error-600"
            : "text-success-600"
        }`}
      >
        {isLate
          ? `${durationText} terlambat`
          : `${durationText} tersisa`}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getStatusClass(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {getStatusLabel(status)}
    </span>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";

const textareaClass =
  "w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-theme-sm text-gray-800 shadow-theme-xs outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";

function SelectArrow() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
    >
      <path
        d="m6 8 4 4 4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditTicketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <path d="M6 3.5h9l3 3V20H6V3.5Z" />
      <path d="M15 3.5V7h3" />
      <path
        strokeLinecap="round"
        d="m9 15 5-5 2 2-5 5-2 .5.5-2.5Z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect
        x="6"
        y="10"
        width="12"
        height="10"
        rx="2"
      />

      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function AssignmentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
      />

      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M4 7h16v12H4V7Z" />
      <path d="M9 7V5h6v2M4 12h16" />
    </svg>
  );
}

function ResponseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M5 5h14v11H9l-4 3V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

function AnalysisIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <circle
        cx="10"
        cy="10"
        r="5"
      />

      <path d="m14 14 5 5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
      />

      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}