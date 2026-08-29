"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { Ticket } from "@/services/ticket.service";
import TicketDetail from "./TicketDetail";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/config";

const REFRESH_INTERVAL = 10_000;

type PriorityFilter =
  | "ALL"
  | "1"
  | "2"
  | "3"
  | "4";

type SortMode =
  | "PRIORITY"
  | "NEWEST"
  | "OLDEST";

type CurrentUser = {
  id: number;
  email?: string;

  employee?: {
    id?: number;
    nik?: string;
    nama?: string;
    jabatan?: string;
    unitKerja?: string;
    jobTitle?: string | null;
  } | null;

  role?: {
    id?: number;
    name?: string;
  } | null;
};

type TicketResponse = {
  success?: boolean;
  message?: string;
  tickets?: Ticket[];

  data?:
    | Ticket[]
    | {
        tickets?: Ticket[];
        items?: Ticket[];
      };
};

type MeResponse = {
  success?: boolean;
  message?: string;
  user?: CurrentUser;
  data?: CurrentUser;
};

type UpdateTicketResponse = {
  success?: boolean;
  message?: string;
  ticket?: Ticket;
};

type AnalysisForm = {
  analisaAwal: string;
  hasilAnalisa: string;
};

const INITIAL_FORM: AnalysisForm = {
  analisaAwal: "",
  hasilAnalisa: "",
};

async function parseJson<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get("content-type");

  if (
    !contentType?.includes("application/json")
  ) {
    const text = await response.text();

    console.error("Response backend:", text);

    throw new Error(
      "Backend tidak mengembalikan JSON."
    );
  }

  return response.json() as Promise<T>;
}

function extractTickets(
  data: TicketResponse
): Ticket[] {
  if (Array.isArray(data.tickets)) {
    return data.tickets;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (
    data.data &&
    typeof data.data === "object"
  ) {
    if (Array.isArray(data.data.tickets)) {
      return data.data.tickets;
    }

    if (Array.isArray(data.data.items)) {
      return data.data.items;
    }
  }

  return [];
}

function normalizeStatus(status?: string) {
  return String(status || "")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");
}

function isOpenStatus(status?: string) {
  return ["OPEN", "ASSIGNED"].includes(
    normalizeStatus(status)
  );
}

function getEmployee(ticket: Ticket) {
  return (
    ticket.reporter?.employee ||
    ticket.employee ||
    null
  );
}

function getReporterName(ticket: Ticket) {
  return (
    getEmployee(ticket)?.nama ||
    ticket.reporter?.email ||
    "Pengguna"
  );
}

function getInitial(name?: string) {
  return (
    String(name || "")
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

function getPriorityName(priority?: number) {
  return (
    {
      1: "Direksi",
      2: "VP / EVP",
      3: "Manager",
      4: "Staff",
    } as Record<number, string>
  )[priority || 0] || "-";
}

function getPriorityDescription(
  priority?: number
) {
  return (
    {
      1: "Prioritas Tertinggi",
      2: "Prioritas Tinggi",
      3: "Prioritas Menengah",
      4: "Prioritas Normal",
    } as Record<number, string>
  )[priority || 0] || "-";
}

function getPriorityAccent(priority?: number) {
  if (priority === 1) {
    return {
      line: "bg-error-500",
      soft: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
      text: "text-error-600 dark:text-error-400",
    };
  }

  if (priority === 2) {
    return {
      line: "bg-warning-500",
      soft: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
      text: "text-warning-700 dark:text-warning-400",
    };
  }

  if (priority === 3) {
    return {
      line: "bg-purple-500",
      soft: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
      text: "text-purple-600 dark:text-purple-400",
    };
  }

  return {
    line: "bg-success-500",
    soft: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
    text: "text-success-700 dark:text-success-400",
  };
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatShortDateTime(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatRemainingTime(
  deadlineValue?: string | null
) {
  if (!deadlineValue) {
    return {
      label: "Batas belum ditentukan",
      className: "text-gray-400",
    };
  }

  const deadline = new Date(deadlineValue);

  if (Number.isNaN(deadline.getTime())) {
    return {
      label: "Tanggal tidak valid",
      className: "text-gray-400",
    };
  }

  const difference =
    deadline.getTime() - Date.now();

  const totalMinutes = Math.ceil(
    Math.abs(difference) / 60_000
  );

  const days = Math.floor(
    totalMinutes / 1440
  );

  const hours = Math.floor(
    (totalMinutes % 1440) / 60
  );

  const minutes = totalMinutes % 60;

  const parts = [
    days > 0 ? `${days} hari` : "",
    hours > 0 ? `${hours} jam` : "",
    minutes > 0 ? `${minutes} menit` : "",
  ].filter(Boolean);

  const duration = parts.join(" ") || "0 menit";

  if (difference < 0) {
    return {
      label: `Terlambat ${duration}`,
      className:
        "text-error-600 dark:text-error-400",
    };
  }

  return {
    label: `${duration} lagi`,
    className:
      "text-success-600 dark:text-success-400",
  };
}

export default function TicketAnalysisManagement() {
  const [tickets, setTickets] =
    useState<Ticket[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [search, setSearch] = useState("");

  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("ALL");

  const [sortMode, setSortMode] =
    useState<SortMode>("PRIORITY");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [detailTicket, setDetailTicket] =
    useState<Ticket | null>(null);

  const [analysisTicket, setAnalysisTicket] =
    useState<Ticket | null>(null);

  const [form, setForm] =
    useState<AnalysisForm>(INITIAL_FORM);

  const [formError, setFormError] =
    useState("");

  const loadData = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        const [ticketResponse, meResponse] =
          await Promise.all([
            apiFetch(`${API_URL}/tickets`, {
              headers: {
                Accept: "application/json",
              },
              cache: "no-store",
            }),
            apiFetch(`${API_URL}/auth/me`, {
              headers: {
                Accept: "application/json",
              },
              cache: "no-store",
            }),
          ]);

        const ticketData =
          await parseJson<TicketResponse>(
            ticketResponse
          );

        const meData =
          await parseJson<MeResponse>(
            meResponse
          );

        if (
          !ticketResponse.ok ||
          ticketData.success === false
        ) {
          throw new Error(
            ticketData.message ||
              "Gagal mengambil ticket."
          );
        }

        if (
          !meResponse.ok ||
          meData.success === false
        ) {
          throw new Error(
            meData.message ||
              "Gagal mengambil pengguna login."
          );
        }

        const loggedInUser =
          meData.user || meData.data;

        if (!loggedInUser) {
          throw new Error(
            "Data pengguna login tidak ditemukan."
          );
        }

        setTickets(extractTickets(ticketData));
        setCurrentUser(loggedInUser);
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal memuat halaman analisis ticket."
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadData(true);

    const intervalId = window.setInterval(() => {
      void loadData(false);
    }, REFRESH_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const assignedOpenTickets = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return tickets.filter(
      (ticket) =>
        ticket.handlerId === currentUser.id &&
        isOpenStatus(ticket.status)
    );
  }, [tickets, currentUser]);

  const statistics = useMemo(
    () => ({
      total: assignedOpenTickets.length,
      p1: assignedOpenTickets.filter(
        (ticket) => ticket.priority === 1
      ).length,
      p2: assignedOpenTickets.filter(
        (ticket) => ticket.priority === 2
      ).length,
      p3: assignedOpenTickets.filter(
        (ticket) => ticket.priority === 3
      ).length,
      p4: assignedOpenTickets.filter(
        (ticket) => ticket.priority === 4
      ).length,
    }),
    [assignedOpenTickets]
  );

  const filteredTickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...assignedOpenTickets]
      .filter((ticket) => {
        const employee = getEmployee(ticket);

        const searchable = [
          ticket.noPelaporan,
          ticket.keluhan,
          ticket.kategoriKeluhan || "",
          employee?.nik || "",
          employee?.nama || "",
          employee?.jabatan || "",
          employee?.unitKerja || "",
          getPriorityName(ticket.priority),
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!keyword ||
            searchable.includes(keyword)) &&
          (priorityFilter === "ALL" ||
            ticket.priority ===
              Number(priorityFilter))
        );
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.waktuKeluhan || a.createdAt || 0
        ).getTime();

        const dateB = new Date(
          b.waktuKeluhan || b.createdAt || 0
        ).getTime();

        if (sortMode === "NEWEST") {
          return dateB - dateA;
        }

        if (sortMode === "OLDEST") {
          return dateA - dateB;
        }

        const priorityDifference =
          (a.priority || 99) -
          (b.priority || 99);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return dateA - dateB;
      });
  }, [
    assignedOpenTickets,
    search,
    priorityFilter,
    sortMode,
  ]);

  function openAnalysis(ticket: Ticket) {
    setAnalysisTicket(ticket);

    setForm({
      analisaAwal: ticket.analisaAwal || "",
      hasilAnalisa: ticket.hasilAnalisa || "",
    });

    setFormError("");
  }

  function closeAnalysis() {
    if (saving) {
      return;
    }

    setAnalysisTicket(null);
    setForm(INITIAL_FORM);
    setFormError("");
  }

  async function submitAnalysis(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!analysisTicket) {
      return;
    }

    const analisaAwal =
      form.analisaAwal.trim();

    const hasilAnalisa =
      form.hasilAnalisa.trim();

    if (!analisaAwal) {
      setFormError("Analisa awal wajib diisi.");
      return;
    }

    if (!hasilAnalisa) {
      setFormError("Hasil analisa wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const response = await apiFetch(
        `${API_URL}/tickets/${analysisTicket.id}/progress`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            status: "IN_PROGRESS",
            analisaAwal,
            hasilAnalisa,
          }),
        }
      );

      const data =
        await parseJson<UpdateTicketResponse>(
          response
        );

      if (
        !response.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
            "Gagal menyimpan analisis ticket."
        );
      }

      setAnalysisTicket(null);
      setForm(INITIAL_FORM);

      setSuccess(
        data.message ||
          "Analisis berhasil disimpan. Ticket masuk ke proses pengerjaan."
      );

      await loadData(false);
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal menyimpan analisis ticket."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-5 pb-8">
        <section className="rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-theme-xs text-gray-400">
                <span>Home</span>
                <span>›</span>
                <span className="text-gray-500 dark:text-gray-300">
                  Analisis Ticket
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                Analisis Ticket
              </h1>

              <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
                Ticket berstatus Open yang sudah dieskalasikan kepada Anda untuk dianalisis.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {getInitial(
                  currentUser?.employee?.nama ||
                    currentUser?.email
                )}
              </div>

              <div>
                <p className="text-[11px] text-gray-400">
                  IT HelpDesk aktif
                </p>

                <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                  {currentUser?.employee?.nama ||
                    currentUser?.email ||
                    "Memuat..."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <Alert className="border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </Alert>
        )}

        {success && (
          <Alert className="border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
            {success}
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PrioritySummaryCard
            label="Direksi"
            value={statistics.p1}
            description="Prioritas Tertinggi"
            priority={1}
          />

          <PrioritySummaryCard
            label="VP / EVP"
            value={statistics.p2}
            description="Prioritas Tinggi"
            priority={2}
          />

          <PrioritySummaryCard
            label="Manager"
            value={statistics.p3}
            description="Prioritas Menengah"
            priority={3}
          />

          <PrioritySummaryCard
            label="Staff"
            value={statistics.p4}
            description="Prioritas Normal"
            priority={4}
          />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-1">
              <FilterTab
                active={priorityFilter === "ALL"}
                label="Semua Jabatan"
                count={statistics.total}
                onClick={() => setPriorityFilter("ALL")}
              />

              <FilterTab
                active={priorityFilter === "1"}
                label="Direksi"
                count={statistics.p1}
                onClick={() => setPriorityFilter("1")}
              />

              <FilterTab
                active={priorityFilter === "2"}
                label="VP / EVP"
                count={statistics.p2}
                onClick={() => setPriorityFilter("2")}
              />

              <FilterTab
                active={priorityFilter === "3"}
                label="Manager"
                count={statistics.p3}
                onClick={() => setPriorityFilter("3")}
              />

              <FilterTab
                active={priorityFilter === "4"}
                label="Staff"
                count={statistics.p4}
                onClick={() => setPriorityFilter("4")}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <SearchIcon />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Cari ticket..."
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-theme-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:w-[260px]"
                />
              </div>

              <select
                value={sortMode}
                onChange={(event) =>
                  setSortMode(
                    event.target.value as SortMode
                  )
                }
                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="PRIORITY">
                  Urutkan: Priority
                </option>
                <option value="NEWEST">
                  Urutkan: Terbaru
                </option>
                <option value="OLDEST">
                  Urutkan: Terlama
                </option>
              </select>
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingState />
        ) : filteredTickets.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="space-y-3">
            {filteredTickets.map((ticket) => (
              <AnalysisTicketCard
                key={ticket.id}
                ticket={ticket}
                onDetail={() =>
                  setDetailTicket(ticket)
                }
                onAnalysis={() =>
                  openAnalysis(ticket)
                }
              />
            ))}
          </section>
        )}

        <section className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 px-5 py-4 dark:border-brand-500/20 dark:bg-brand-500/[0.06]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-white text-brand-600 dark:border-brand-500/30 dark:bg-gray-900 dark:text-brand-400">
            i
          </div>

          <div>
            <h3 className="text-theme-sm font-bold text-gray-800 dark:text-white/90">
              Tips Analisis Ticket
            </h3>

            <p className="mt-1 text-theme-xs leading-5 text-gray-500 dark:text-gray-400">
              Utamakan ticket Direksi dan VP/EVP terlebih dahulu. Pastikan analisis dilakukan tepat waktu sesuai SLA.
            </p>
          </div>
        </section>
      </div>

      {detailTicket &&
        typeof document !== "undefined" &&
        createPortal(
          <TicketDetail
            ticket={detailTicket}
            onClose={() => setDetailTicket(null)}
          />,
          document.body
        )}

      {analysisTicket && (
        <AnalysisModal
          ticket={analysisTicket}
          form={form}
          saving={saving}
          error={formError}
          onChange={setForm}
          onClose={closeAnalysis}
          onSubmit={submitAnalysis}
        />
      )}
    </>
  );
}

function AnalysisTicketCard({
  ticket,
  onDetail,
  onAnalysis,
}: {
  ticket: Ticket;
  onDetail: () => void;
  onAnalysis: () => void;
}) {
  const employee = getEmployee(ticket);
  const name = getReporterName(ticket);
  const accent = getPriorityAccent(ticket.priority);
  const remaining = formatRemainingTime(
    ticket.batasResponse
  );

  return (
    <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-theme-xs transition hover:border-brand-200 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${accent.line}`}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_150px_280px_220px] xl:items-center">
        <div className="min-w-0 pl-2">
          <p className="text-theme-sm font-bold text-brand-600 dark:text-brand-400">
            {ticket.noPelaporan}
          </p>

          <h3 className="mt-2 line-clamp-2 text-base font-bold text-gray-800 dark:text-white/90">
            {ticket.keluhan}
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-2 text-theme-xs text-gray-500 dark:text-gray-400 sm:grid-cols-3">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {name}
              </p>
              <p className="mt-0.5">
                {employee?.nik || "-"}
              </p>
            </div>

            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {employee?.unitKerja || "-"}
              </p>
              <p className="mt-0.5">
                {employee?.jabatan || "-"}
              </p>
            </div>

            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                {formatShortDateTime(
                  ticket.waktuKeluhan
                )}
              </p>
              <p className="mt-0.5">Waktu keluhan</p>
            </div>
          </div>
        </div>

        <div>
          <span
            className={`inline-flex rounded-lg px-4 py-2 text-theme-sm font-semibold ${accent.soft}`}
          >
            {getPriorityName(ticket.priority)}
          </span>

          <p
            className={`mt-2 text-[11px] font-medium ${accent.text}`}
          >
            {getPriorityDescription(ticket.priority)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-[11px] font-semibold text-gray-400">
              Kategori
            </p>
            <p className="mt-1 text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
              {ticket.kategoriKeluhan ||
                "Belum dikategorikan"}
            </p>
          </div>

          <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-800">
            <p className="text-[11px] font-semibold text-gray-400">
              Batas Analisis
            </p>
            <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-300">
              {formatDateTime(ticket.batasResponse)}
            </p>
            <p
              className={`mt-1 text-[11px] font-semibold ${remaining.className}`}
            >
              {remaining.label}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-start gap-2 xl:justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDetail();
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <EyeIcon />
            Detail
          </button>

          <button
            type="button"
            onClick={onAnalysis}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-theme-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <AnalysisIcon />
            Analisis
          </button>
        </div>
      </div>
    </article>
  );
}

function PrioritySummaryCard({
  label,
  value,
  description,
  priority,
}: {
  label: string;
  value: number;
  description: string;
  priority: number;
}) {
  const accent = getPriorityAccent(priority);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${accent.soft}`}
        >
          <PriorityIcon priority={priority} />
        </div>

        <div>
          <p className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-white/90">
            {value}
          </p>
          <p
            className={`mt-1 text-theme-xs font-medium ${accent.text}`}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-theme-sm font-semibold transition ${
        active
          ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
          : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
      }`}
    >
      {label}

      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] ${
          active
            ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function AnalysisModal({
  ticket,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  ticket: Ticket;
  form: AnalysisForm;
  saving: boolean;
  error: string;
  onChange: React.Dispatch<
    React.SetStateAction<AnalysisForm>
  >;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>
  ) => void;
}) {
  return (
    <ModalWrapper onClose={onClose}>
      <form
        onSubmit={onSubmit}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
              Analisis Ticket
            </h2>
            <p className="mt-1 text-theme-sm font-semibold text-brand-600 dark:text-brand-400">
              {ticket.noPelaporan}
            </p>
          </div>

          <CloseButton
            onClick={onClose}
            disabled={saving}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {error && (
            <Alert className="mb-5 border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </Alert>
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-400">
              Keluhan
            </p>
            <p className="mt-2 whitespace-pre-wrap text-theme-sm leading-6 text-gray-700 dark:text-gray-300">
              {ticket.keluhan}
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <Field label="Analisa Awal" required>
              <textarea
                rows={6}
                value={form.analisaAwal}
                disabled={saving}
                onChange={(event) =>
                  onChange((previous) => ({
                    ...previous,
                    analisaAwal: event.target.value,
                  }))
                }
                placeholder="Tuliskan dugaan penyebab, hasil pengecekan awal, dan rencana penanganan..."
                className={textareaClass}
              />
            </Field>

            <Field label="Hasil Analisa" required>
              <textarea
                rows={6}
                value={form.hasilAnalisa}
                disabled={saving}
                onChange={(event) =>
                  onChange((previous) => ({
                    ...previous,
                    hasilAnalisa: event.target.value,
                  }))
                }
                placeholder="Tuliskan hasil analisa teknis dan kesimpulan awal..."
                className={textareaClass}
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-theme-xs text-gray-400">
            Status berubah dari Open menjadi In Progress.
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !form.analisaAwal.trim() ||
                !form.hasilAnalisa.trim()
              }
              className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}

              {saving
                ? "Menyimpan..."
                : "Simpan Analisis"}
            </button>
          </div>
        </div>
      </form>
    </ModalWrapper>
  );
}

function ModalWrapper({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      {children}
    </div>
  );
}

function CloseButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 disabled:opacity-60 dark:hover:bg-gray-800"
    >
      ✕
    </button>
  );
}

function Alert({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 text-theme-sm ${className}`}
    >
      {children}
    </div>
  );
}

function Field({
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
      <label className="mb-2 block text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
        {required && (
          <span className="ml-1 text-error-500">*</span>
        )}
      </label>
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat ticket analisis...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="font-semibold text-gray-800 dark:text-white/90">
        Tidak ada ticket yang perlu dianalisis
      </h3>
      <p className="mt-2 max-w-sm text-theme-sm text-gray-500 dark:text-gray-400">
        Semua ticket Open yang ditugaskan kepada Anda sudah masuk proses.
      </p>
    </div>
  );
}

function PriorityIcon({
  priority,
}: {
  priority: number;
}) {
  if (priority === 1) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-7 w-7"
      >
        <path
          d="m4 8 4 3 4-6 4 6 4-3-2 11H6L4 8Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (priority === 2) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-7 w-7"
      >
        <circle cx="12" cy="7" r="3" />
        <path
          d="M6 20a6 6 0 0 1 12 0M18 8h3m-1.5-1.5v3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (priority === 3) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-7 w-7"
      >
        <path
          d="M7 8V5h10v3M5 8h14v11H5V8Zm5 0v3h4V8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
    >
      <circle cx="12" cy="7" r="3" />
      <path
        d="M5 21a7 7 0 0 1 14 0"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" />
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
      <path
        d="M4 18V9m5 9V5m5 13v-7m5 7V3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
    >
      <circle cx="11" cy="11" r="7" />
      <path
        d="m20 20-3.5-3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const textareaClass =
  "w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-theme-sm text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";