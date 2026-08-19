"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Ticket } from "@/services/ticket.service";
import TicketDetail from "./TicketDetail";
import { apiFetch } from "@/lib/apiFetch";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

const REFRESH_INTERVAL = 15_000;
const ITEMS_PER_PAGE = 10;

type PriorityFilter =
  | "ALL"
  | "1"
  | "2"
  | "3"
  | "4";

type SortMode =
  | "PRIORITY"
  | "NEWEST"
  | "OLDEST"
  | "DEADLINE";

type AnalysisAction =
  | "WORK"
  | "PENDING";

type CurrentUser = {
  id: number;
  email?: string;
  employee?: {
    nama?: string;
    nik?: string;
    jabatan?: string;
    unitKerja?: string;
    jobTitle?: string | null;
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

type UpdateResponse = {
  success?: boolean;
  message?: string;
  ticket?: Ticket;
};

type AnalysisForm = {
  analisaAwal: string;
  hasilAnalisa: string;
  lamaPending: string;
};

const INITIAL_FORM: AnalysisForm = {
  analisaAwal: "",
  hasilAnalisa: "",
  lamaPending: "",
};

async function parseJsonResponse<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get("content-type");

  if (
    !contentType?.includes(
      "application/json"
    )
  ) {
    const responseText =
      await response.text();

    console.error(
      "Response backend bukan JSON:",
      responseText
    );

    throw new Error(
      "Backend tidak mengembalikan JSON."
    );
  }

  return response.json() as Promise<T>;
}

function extractTickets(
  responseData: TicketResponse
): Ticket[] {
  if (
    Array.isArray(
      responseData.tickets
    )
  ) {
    return responseData.tickets;
  }

  if (
    Array.isArray(
      responseData.data
    )
  ) {
    return responseData.data;
  }

  if (
    responseData.data &&
    typeof responseData.data ===
    "object"
  ) {
    if (
      Array.isArray(
        responseData.data.tickets
      )
    ) {
      return responseData.data.tickets;
    }

    if (
      Array.isArray(
        responseData.data.items
      )
    ) {
      return responseData.data.items;
    }
  }

  return [];
}

function normalizeStatus(
  status?: string
) {
  return String(status || "")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");
}

function getEmployee(
  ticket: Ticket
) {
  return (
    ticket.reporter?.employee ||
    ticket.employee ||
    null
  );
}

function getReporterName(
  ticket: Ticket
) {
  return (
    getEmployee(ticket)?.nama ||
    ticket.reporter?.email ||
    "Pengguna"
  );
}

function getInitial(
  name?: string
) {
  return (
    String(name || "")
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

function getPriorityLabel(
  priority?: number | null
) {
  const labels: Record<number, string> = {
    1: "Direksi",
    2: "VP/EVP",
    3: "Manager",
    4: "Staff",
  };

  return (
    labels[priority || 0] ||
    "Belum ditentukan"
  );
}

function getPriorityDescription(
  priority?: number | null
) {
  const labels: Record<number, string> = {
    1: "Prioritas tertinggi",
    2: "Prioritas tinggi",
    3: "Prioritas menengah",
    4: "Prioritas normal",
  };

  return (
    labels[priority || 0] ||
    "Priority belum tersedia"
  );
}

function getPriorityClass(
  priority?: number | null
) {
  if (priority === 1) {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }

  if (priority === 2) {
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
  }

  if (priority === 3) {
    return "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
  }

  if (priority === 4) {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Asia/Jakarta",
    }
  ).format(date);
}

function getRemainingTime(
  deadlineValue?: string | null
) {
  if (!deadlineValue) {
    return {
      label:
        "Batas response belum tersedia",
      className:
        "text-gray-400",
      state: "UNSET",
    };
  }

  const deadline =
    new Date(
      deadlineValue
    ).getTime();

  if (
    Number.isNaN(
      deadline
    )
  ) {
    return {
      label:
        "Tanggal tidak valid",
      className:
        "text-gray-400",
      state: "UNSET",
    };
  }

  const difference =
    deadline - Date.now();

  const absoluteMinutes =
    Math.ceil(
      Math.abs(
        difference
      ) / 60_000
    );

  const days =
    Math.floor(
      absoluteMinutes / 1440
    );

  const hours =
    Math.floor(
      (absoluteMinutes % 1440) / 60
    );

  const minutes =
    absoluteMinutes % 60;

  const duration = [
    days > 0
      ? `${days} hari`
      : "",
    hours > 0
      ? `${hours} jam`
      : "",
    minutes > 0
      ? `${minutes} menit`
      : "",
  ]
    .filter(Boolean)
    .join(" ") || "0 menit";

  if (
    difference < 0
  ) {
    return {
      label:
        `${duration} terlambat`,
      className:
        "text-error-600 dark:text-error-400",
      state: "OVERDUE",
    };
  }

  if (
    difference <=
    2 *
    60 *
    60 *
    1000
  ) {
    return {
      label:
        `${duration} tersisa`,
      className:
        "text-warning-700 dark:text-warning-400",
      state: "DUE_SOON",
    };
  }

  return {
    label:
      `${duration} tersisa`,
    className:
      "text-success-600 dark:text-success-400",
    state: "SAFE",
  };
}

export default function TicketAnalysisManagement() {
  const [
    tickets,
    setTickets,
  ] =
    useState<Ticket[]>([]);

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<PriorityFilter>(
      "ALL"
    );

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "PRIORITY"
    );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
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
    success,
    setSuccess,
  ] = useState("");

  const [
    detailTicket,
    setDetailTicket,
  ] =
    useState<Ticket | null>(
      null
    );

  const [
    analysisTicket,
    setAnalysisTicket,
  ] =
    useState<Ticket | null>(
      null
    );

  const [
    selectedAction,
    setSelectedAction,
  ] =
    useState<AnalysisAction>(
      "WORK"
    );

  const [
    form,
    setForm,
  ] =
    useState<AnalysisForm>(
      INITIAL_FORM
    );

  const [
    formError,
    setFormError,
  ] = useState("");

  const loadData =
    useCallback(
      async (
        showLoading = false
      ) => {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          setError(
            "Sesi login tidak ditemukan."
          );
          setLoading(false);
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          const [
            ticketResponse,
            meResponse,
          ] = await Promise.all([
            apiFetch(
              `${API_URL}/tickets`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  Accept:
                    "application/json",
                },
                cache: "no-store",
              }
            ),
            apiFetch(
              `${API_URL}/auth/me`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  Accept:
                    "application/json",
                },
                cache: "no-store",
              }
            ),
          ]);

          const ticketData =
            await parseJsonResponse<TicketResponse>(
              ticketResponse
            );

          const meData =
            await parseJsonResponse<MeResponse>(
              meResponse
            );

          if (
            !ticketResponse.ok ||
            ticketData.success ===
            false
          ) {
            throw new Error(
              ticketData.message ||
              "Gagal mengambil data ticket."
            );
          }

          if (
            !meResponse.ok ||
            meData.success ===
            false
          ) {
            throw new Error(
              meData.message ||
              "Gagal mengambil pengguna login."
            );
          }

          const loggedInUser =
            meData.user ||
            meData.data;

          if (!loggedInUser) {
            throw new Error(
              "Data pengguna login tidak ditemukan."
            );
          }

          setTickets(
            extractTickets(
              ticketData
            )
          );

          setCurrentUser(
            loggedInUser
          );
        } catch (
        loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Gagal memuat halaman analisis ticket."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadData(true);

    const intervalId =
      window.setInterval(
        () => {
          void loadData(false);
        },
        REFRESH_INTERVAL
      );

    return () =>
      window.clearInterval(
        intervalId
      );
  }, [loadData]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () =>
          setSuccess(""),
        3000
      );

    return () =>
      window.clearTimeout(
        timeoutId
      );
  }, [success]);

  const openTickets =
    useMemo(() => {
      if (!currentUser) {
        return [];
      }

      return tickets.filter(
        (ticket) =>
          ticket.handlerId ===
          currentUser.id &&
          normalizeStatus(
            ticket.status
          ) === "OPEN"
      );
    }, [
      tickets,
      currentUser,
    ]);

  const statistics =
    useMemo(() => {
      const overdue =
        openTickets.filter(
          (ticket) =>
            getRemainingTime(
              ticket.batasResponse
            ).state ===
            "OVERDUE"
        ).length;

      const dueSoon =
        openTickets.filter(
          (ticket) =>
            getRemainingTime(
              ticket.batasResponse
            ).state ===
            "DUE_SOON"
        ).length;

      return {
        total:
          openTickets.length,

        direksi:
          openTickets.filter(
            (ticket) =>
              ticket.priority ===
              1
          ).length,

        vp:
          openTickets.filter(
            (ticket) =>
              ticket.priority ===
              2
          ).length,

        manager:
          openTickets.filter(
            (ticket) =>
              ticket.priority ===
              3
          ).length,

        staff:
          openTickets.filter(
            (ticket) =>
              ticket.priority ===
              4
          ).length,

        overdue,
        dueSoon,
      };
    }, [openTickets]);

  const filteredTickets =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return [
        ...openTickets,
      ]
        .filter(
          (ticket) => {
            const employee =
              getEmployee(
                ticket
              );

            const searchableText =
              [
                ticket.noPelaporan,
                ticket.keluhan,
                ticket.kategoriKeluhan ||
                "",
                employee?.nama ||
                "",
                employee?.nik ||
                "",
                employee?.jabatan ||
                "",
                employee?.unitKerja ||
                "",
                getPriorityLabel(
                  ticket.priority
                ),
              ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !keyword ||
              searchableText.includes(
                keyword
              );

            const matchesPriority =
              priorityFilter ===
              "ALL" ||
              ticket.priority ===
              Number(
                priorityFilter
              );

            return (
              matchesSearch &&
              matchesPriority
            );
          }
        )
        .sort(
          (
            ticketA,
            ticketB
          ) => {
            const dateA =
              new Date(
                ticketA.waktuKeluhan ||
                ticketA.createdAt ||
                0
              ).getTime();

            const dateB =
              new Date(
                ticketB.waktuKeluhan ||
                ticketB.createdAt ||
                0
              ).getTime();

            if (
              sortMode ===
              "NEWEST"
            ) {
              return (
                dateB - dateA
              );
            }

            if (
              sortMode ===
              "OLDEST"
            ) {
              return (
                dateA - dateB
              );
            }

            if (
              sortMode ===
              "DEADLINE"
            ) {
              const deadlineA =
                ticketA.batasResponse
                  ? new Date(
                    ticketA.batasResponse
                  ).getTime()
                  : Number.MAX_SAFE_INTEGER;

              const deadlineB =
                ticketB.batasResponse
                  ? new Date(
                    ticketB.batasResponse
                  ).getTime()
                  : Number.MAX_SAFE_INTEGER;

              return (
                deadlineA -
                deadlineB
              );
            }

            const priorityDifference =
              (ticketA.priority ||
                99) -
              (ticketB.priority ||
                99);

            if (
              priorityDifference !==
              0
            ) {
              return priorityDifference;
            }

            return (
              dateA - dateB
            );
          }
        );
    }, [
      openTickets,
      search,
      priorityFilter,
      sortMode,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    priorityFilter,
    sortMode,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredTickets.length /
        ITEMS_PER_PAGE
      )
    );

  const paginatedTickets =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredTickets.slice(
        start,
        start +
        ITEMS_PER_PAGE
      );
    }, [
      filteredTickets,
      currentPage,
    ]);

  function openAnalysis(
    ticket: Ticket
  ) {
    setAnalysisTicket(
      ticket
    );

    setSelectedAction(
      "WORK"
    );

    setForm({
      analisaAwal:
        ticket.analisaAwal || "",

      hasilAnalisa:
        ticket.hasilAnalisa || "",

      /*
       * Backend menyimpan lamaPending dalam menit.
       * Pada form ditampilkan dalam jam.
       */
      lamaPending:
        ticket.lamaPending &&
          ticket.lamaPending > 0
          ? String(
            ticket.lamaPending / 60
          )
          : "",
    });

    setFormError("");
  }

  function closeAnalysis() {
    if (saving) {
      return;
    }

    setAnalysisTicket(
      null
    );

    setSelectedAction(
      "WORK"
    );

    setForm(
      INITIAL_FORM
    );

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
      setFormError(
        "Analisa awal wajib diisi."
      );
      return;
    }

    if (!hasilAnalisa) {
      setFormError(
        "Hasil analisa wajib diisi."
      );
      return;
    }

    const lamaPendingHours =
      Number(form.lamaPending);

    const lamaPendingMinutes =
      Math.round(
        lamaPendingHours * 60
      );

    if (
      selectedAction === "PENDING" &&
      (
        Number.isNaN(
          lamaPendingHours
        ) ||
        lamaPendingHours <= 0
      )
    ) {
      setFormError(
        "Lama pending harus lebih dari 0 jam."
      );

      return;
    }

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {
      setFormError(
        "Sesi login tidak ditemukan."
      );
      return;
    }

    const now =
      new Date().toISOString();

    const status: Ticket["status"] =
      selectedAction ===
        "PENDING"
        ? "PENDING"
        : "ON_GOING";

    const body: Partial<Ticket> = {
      status,
      analisaAwal,
      hasilAnalisa,
      mulaiPengerjaan:
        selectedAction ===
          "WORK"
          ? analysisTicket.mulaiPengerjaan ||
          now
          : analysisTicket.mulaiPengerjaan,
      isPending:
        selectedAction ===
        "PENDING",
      lamaPending:
        selectedAction === "PENDING"
          ? lamaPendingMinutes
          : analysisTicket.lamaPending ||
          0,

      catatan:
        analysisTicket.catatan,
    };

    try {
      setSaving(true);
      setFormError("");

      const response =
        await apiFetch(
          `${API_URL}/tickets/${analysisTicket.id}/progress`,
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
            body:
              JSON.stringify(
                body
              ),
          }
        );

      const data =
        await parseJsonResponse<UpdateResponse>(
          response
        );

      if (
        !response.ok ||
        data.success ===
        false
      ) {
        setFormError(
          data.message ||
          "Gagal menyimpan analisis ticket."
        );
        return;
      }

      setTickets(
        (
          previousTickets
        ) =>
          previousTickets.map(
            (ticket) => {
              if (
                ticket.id !==
                analysisTicket.id
              ) {
                return ticket;
              }

              return {
                ...ticket,
                ...(data.ticket ||
                  {}),
                ...body,
              } as Ticket;
            }
          )
      );

      setAnalysisTicket(
        null
      );

      setSelectedAction(
        "WORK"
      );

      setForm(
        INITIAL_FORM
      );

      setFormError("");

      setSuccess(
        data.message ||
        (status ===
          "ON_GOING"
          ? "Analisis berhasil disimpan dan ticket mulai dikerjakan."
          : "Analisis berhasil disimpan dan ticket dipindahkan ke Pending.")
      );

      await loadData(false);
    } catch (
    submitError
    ) {
      setFormError(
        submitError instanceof
          Error
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
        <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-7 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03] sm:px-8">
          {/* <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[35%] overflow-hidden lg:block">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-50 dark:bg-brand-500/10" />

            <div
              className="absolute bottom-5 left-2 h-20 w-44 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(70,95,255,0.28) 1.5px, transparent 1.5px)",
                backgroundSize:
                  "16px 16px",
              }}
            />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-theme-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                IT HelpDesk
              </p>

              <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white/90 sm:text-3xl">
                Analisis Ticket
              </h1>

              <p className="mt-3 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Analisis ticket baru yang sudah di-assign kepada Anda, lalu pilih untuk mulai dikerjakan atau dipending.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {getInitial(
                    currentUser
                      ?.employee
                      ?.nama ||
                      currentUser
                        ?.email
                  )}
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">
                    IT HelpDesk aktif
                  </p>

                  <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                    {currentUser
                      ?.employee?.nama ||
                      currentUser
                        ?.email ||
                      "Memuat..."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadData(
                    false
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-theme-sm font-semibold text-gray-700 shadow-theme-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                <RefreshIcon
                  spinning={
                    refreshing
                  }
                />
                Perbarui
              </button>
            </div>
          </div> */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] overflow-hidden lg:block">
            <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand-50 dark:bg-brand-500/10" />
            <div className="absolute right-40 top-10 h-24 w-24 rounded-full bg-brand-100/70 dark:bg-brand-500/10" />
            <div className="absolute right-72 top-4 h-6 w-6 rounded-full bg-brand-100 dark:bg-brand-500/20" />
            <div
              className="absolute bottom-8 left-4 h-24 w-44 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(70,95,255,0.28) 1.5px, transparent 1.5px)",
                backgroundSize: "16px 16px",
              }}
            />
          </div>
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                IT HelpDesk
              </div>

              <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                Analisis Ticket
              </h1>

              <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Analisis ticket baru yang sudah di-assign kepada Anda, lalu pilih untuk mulai dikerjakan atau dipending.

              </p>
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

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Perlu Dianalisis"
            value={
              statistics.total
            }
            description="Ticket Open"
            tone="brand"
          />

          <SummaryCard
            label="Direksi & VP/EVP"
            value={
              statistics.direksi +
              statistics.vp
            }
            description="Prioritas utama"
            tone="error"
          />

          <SummaryCard
            label="Mendekati SLA"
            value={
              statistics.dueSoon
            }
            description="Kurang dari 2 jam"
            tone="warning"
          />

          <SummaryCard
            label="Melewati SLA"
            value={
              statistics.overdue
            }
            description="Segera dianalisis"
            tone="purple"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Daftar Ticket Open
              </h2>

              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                Menampilkan{" "}
                {
                  filteredTickets.length
                }{" "}
                ticket yang perlu dianalisis.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
              <div className="relative w-full sm:w-[300px]">
                <SearchIcon />

                <input
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Cari ticket..."
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-theme-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              <div className="relative w-full sm:w-[165px]">
                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(
                      event.target.value as PriorityFilter
                    )
                  }
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-10 text-theme-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <option value="ALL">
                    Semua Posisi
                  </option>

                  <option value="1">
                    Direksi
                  </option>

                  <option value="2">
                    VP/EVP
                  </option>

                  <option value="3">
                    Manager
                  </option>

                  <option value="4">
                    Staff
                  </option>
                </select>

                <ChevronDownIcon />
              </div>

              <div className="relative w-full sm:w-[155px]">
                <select
                  value={sortMode}
                  onChange={(event) =>
                    setSortMode(
                      event.target.value as SortMode
                    )
                  }
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-10 text-theme-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <option value="PRIORITY">
                    Priority
                  </option>

                  <option value="DEADLINE">
                    SLA Terdekat
                  </option>

                  <option value="NEWEST">
                    Terbaru
                  </option>

                  <option value="OLDEST">
                    Terlama
                  </option>
                </select>

                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : paginatedTickets
            .length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1100px] table-fixed">
                  <colgroup>
                    <col className="w-[15%]" />
                    <col className="w-[18%]" />
                    <col className="w-[27%]" />
                    <col className="w-[11%]" />
                    <col className="w-[16%]" />
                    <col className="w-[13%]" />
                  </colgroup>

                  <thead className="bg-gray-50/80 dark:bg-gray-900">
                    <tr>
                      <TableHeader>
                        No. Ticket
                      </TableHeader>
                      <TableHeader>
                        Pelapor
                      </TableHeader>
                      <TableHeader>
                        Keluhan
                      </TableHeader>
                      <TableHeader>
                        Priority
                      </TableHeader>
                      <TableHeader>
                        Batas Response
                      </TableHeader>
                      <TableHeader align="center">
                        Aksi
                      </TableHeader>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginatedTickets.map(
                      (ticket) => {
                        const employee =
                          getEmployee(
                            ticket
                          );

                        const remaining =
                          getRemainingTime(
                            ticket.batasResponse
                          );

                        return (
                          <tr
                            key={
                              ticket.id
                            }
                            className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-5 align-top">
                              <p className="break-all text-theme-xs font-bold text-brand-600 dark:text-brand-400">
                                {
                                  ticket.noPelaporan
                                }
                              </p>

                              <p className="mt-2 text-[10px] text-gray-400">
                                {formatDateTime(
                                  ticket.waktuKeluhan ||
                                  ticket.createdAt
                                )}
                              </p>
                            </td>

                            <td className="px-5 py-5 align-top">
                              <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                                {getReporterName(
                                  ticket
                                )}
                              </p>

                              <p className="mt-1 truncate text-theme-xs text-gray-400">
                                {employee?.nik ||
                                  "-"}
                              </p>

                              <p className="mt-1 truncate text-[11px] text-gray-400">
                                {employee?.unitKerja ||
                                  "-"}
                              </p>
                            </td>

                            <td className="px-5 py-5 align-top">
                              <p className="line-clamp-2 text-theme-sm font-semibold leading-6 text-gray-800 dark:text-white/90">
                                {ticket.keluhan ||
                                  "Keluhan tidak tersedia"}
                              </p>

                              <p className="mt-2 text-theme-xs text-gray-400">
                                {ticket.kategoriKeluhan ||
                                  "Kategori belum ditentukan"}
                              </p>
                            </td>

                            <td className="px-5 py-5 align-top">
                              <PriorityBadge
                                priority={
                                  ticket.priority
                                }
                              />
                            </td>

                            <td className="px-5 py-5 align-top">
                              <p className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                                {formatDateTime(
                                  ticket.batasResponse
                                )}
                              </p>

                              <p
                                className={`mt-2 text-[11px] font-semibold ${remaining.className}`}
                              >
                                {
                                  remaining.label
                                }
                              </p>
                            </td>

                            <td className="px-5 py-5 text-center align-middle">
                              <div className="flex items-center justify-center gap-2">
                                {/* Detail */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailTicket(ticket)
                                  }
                                  title="Lihat Detail"
                                  aria-label="Lihat Detail"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-theme-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                >
                                  <EyeIcon />
                                </button>

                                {/* Analisis */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAnalysis(ticket)
                                  }
                                  title="Analisis Ticket"
                                  aria-label="Analisis Ticket"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-theme-xs transition hover:bg-brand-600"
                                >
                                  <AnalysisActionIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 p-4 lg:hidden">
                {paginatedTickets.map(
                  (ticket) => {
                    const remaining =
                      getRemainingTime(
                        ticket.batasResponse
                      );

                    return (
                      <article
                        key={
                          ticket.id
                        }
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-all text-theme-xs font-bold text-brand-600 dark:text-brand-400">
                              {
                                ticket.noPelaporan
                              }
                            </p>

                            <h3 className="mt-2 line-clamp-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                              {ticket.keluhan ||
                                "Keluhan tidak tersedia"}
                            </h3>
                          </div>

                          <PriorityBadge
                            priority={
                              ticket.priority
                            }
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <MobileInfo
                            label="Pelapor"
                            value={getReporterName(
                              ticket
                            )}
                          />

                          <MobileInfo
                            label="Kategori"
                            value={
                              ticket.kategoriKeluhan ||
                              "Belum ditentukan"
                            }
                          />

                          <MobileInfo
                            label="Batas Response"
                            value={formatDateTime(
                              ticket.batasResponse
                            )}
                          />

                          <MobileInfo
                            label="Sisa Waktu"
                            value={
                              remaining.label
                            }
                          />
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDetailTicket(
                                ticket
                              )
                            }
                            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white text-theme-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          >
                            Detail
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openAnalysis(
                                ticket
                              )
                            }
                            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-500 text-theme-sm font-semibold text-white"
                          >
                            Analisis
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </>
          )}

          {!loading &&
            filteredTickets.length >
            0 && (
              <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  Menampilkan{" "}
                  {(currentPage -
                    1) *
                    ITEMS_PER_PAGE +
                    1}{" "}
                  -{" "}
                  {Math.min(
                    currentPage *
                    ITEMS_PER_PAGE,
                    filteredTickets.length
                  )}{" "}
                  dari{" "}
                  {
                    filteredTickets.length
                  }{" "}
                  data
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                  >
                    ‹
                  </button>

                  <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-brand-500 px-3 text-theme-xs font-semibold text-brand-600 dark:text-brand-400">
                    {currentPage}
                  </span>

                  <button
                    type="button"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
        </section>
      </div>

      {detailTicket && (
        <TicketDetail
          ticket={detailTicket}
          onClose={() =>
            setDetailTicket(
              null
            )
          }
        />
      )}

      {analysisTicket && (
        <AnalysisModal
          ticket={
            analysisTicket
          }
          action={
            selectedAction
          }
          form={form}
          saving={saving}
          error={formError}
          onActionChange={
            setSelectedAction
          }
          onChange={setForm}
          onClose={
            closeAnalysis
          }
          onSubmit={
            submitAnalysis
          }
        />
      )}
    </>
  );
}

function AnalysisModal({
  ticket,
  action,
  form,
  saving,
  error,
  onActionChange,
  onChange,
  onClose,
  onSubmit,
}: {
  ticket: Ticket;
  action: AnalysisAction;
  form: AnalysisForm;
  saving: boolean;
  error: string;
  onActionChange: (
    action: AnalysisAction
  ) => void;
  onChange: React.Dispatch<
    React.SetStateAction<AnalysisForm>
  >;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>
  ) => void;
}) {
  const employee =
    getEmployee(ticket);

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <form
        onSubmit={onSubmit}
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
      >
        <header className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                Analisis Ticket
              </h2>

              <PriorityBadge
                priority={
                  ticket.priority
                }
              />
            </div>

            <p className="mt-1 text-theme-sm font-semibold text-brand-600 dark:text-brand-400">
              {
                ticket.noPelaporan
              }
            </p>

            <p className="mt-1 text-theme-xs text-gray-400">
              Setelah analisis, pilih Kerjakan atau Pending.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-400 transition hover:bg-gray-100 disabled:opacity-60 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {error && (
            <Alert className="mb-5 border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </Alert>
          )}

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoItem
                label="Pelapor"
                value={getReporterName(
                  ticket
                )}
                secondary={
                  employee?.nik ||
                  "-"
                }
              />

              <InfoItem
                label="Jabatan"
                value={
                  employee?.jabatan ||
                  "-"
                }
                secondary={
                  employee?.unitKerja ||
                  "-"
                }
              />

              <InfoItem
                label="Batas Response"
                value={formatDateTime(
                  ticket.batasResponse
                )}
                secondary={
                  getRemainingTime(
                    ticket.batasResponse
                  ).label
                }
              />
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Keluhan
              </p>

              <p className="mt-2 whitespace-pre-wrap text-theme-sm leading-6 text-gray-700 dark:text-gray-300">
                {ticket.keluhan}
              </p>
            </div>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5">
            <Field
              label="Analisa Awal"
              required
            >
              <textarea
                rows={5}
                value={
                  form.analisaAwal
                }
                disabled={saving}
                onChange={(
                  event
                ) =>
                  onChange(
                    (
                      previous
                    ) => ({
                      ...previous,
                      analisaAwal:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Tuliskan dugaan penyebab, hasil pengecekan awal, dan kondisi perangkat atau layanan..."
                className={
                  textareaClass
                }
              />
            </Field>

            <Field
              label="Hasil Analisa"
              required
            >
              <textarea
                rows={5}
                value={
                  form.hasilAnalisa
                }
                disabled={saving}
                onChange={(
                  event
                ) =>
                  onChange(
                    (
                      previous
                    ) => ({
                      ...previous,
                      hasilAnalisa:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Tuliskan kesimpulan analisa teknis dan rencana tindak lanjut..."
                className={
                  textareaClass
                }
              />
            </Field>
          </div>

          <section className="mt-6">
            <div>
              <h3 className="text-theme-sm font-bold text-gray-800 dark:text-white/90">
                Tindakan Selanjutnya
              </h3>

              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                Pilih apakah ticket langsung dikerjakan atau dipending.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ActionCard
                active={
                  action ===
                  "WORK"
                }
                title="Kerjakan Sekarang"
                description="Status berubah menjadi On Going dan mulai pengerjaan dicatat otomatis."
                icon={
                  <WorkIcon />
                }
                tone="brand"
                onClick={() =>
                  onActionChange(
                    "WORK"
                  )
                }
              />

              <ActionCard
                active={
                  action ===
                  "PENDING"
                }
                title="Pending"
                description="Status berubah menjadi Pending dan lama pending dicatat."
                icon={
                  <PauseIcon />
                }
                tone="warning"
                onClick={() =>
                  onActionChange(
                    "PENDING"
                  )
                }
              />
            </div>
          </section>

          {action === "PENDING" && (
            <section className="mt-5 rounded-xl border border-warning-200 bg-warning-50/70 p-4 dark:border-warning-500/30 dark:bg-warning-500/[0.08]">
              <Field
                label="Lama Pending"
                required
              >
                <div className="relative">
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={form.lamaPending}
                    disabled={saving}
                    onChange={(event) =>
                      onChange((previous) => ({
                        ...previous,
                        lamaPending: event.target.value,
                      }))
                    }
                    placeholder="Contoh: 2"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 pr-20 text-theme-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-theme-xs font-medium text-gray-400">
                    jam
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Contoh: 0.5 jam, 1 jam, atau 2 jam.
                </p>
              </Field>
            </section>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-theme-xs text-gray-400">
            Status setelah disimpan:{" "}
            <strong>
              {action ===
                "WORK"
                ? "On Going"
                : "Pending"}
            </strong>
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
                !form.hasilAnalisa.trim() ||
                (action ===
                  "PENDING" &&
                  !form.lamaPending)
              }
              className={`inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-lg px-5 text-theme-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${action ===
                "WORK"
                ? "bg-brand-500 hover:bg-brand-600"
                : "bg-warning-500 hover:bg-warning-600"
                }`}
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}

              {saving
                ? "Menyimpan..."
                : action ===
                  "WORK"
                  ? "Simpan & Kerjakan"
                  : "Simpan & Pending"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

type SummaryTone =
  | "brand"
  | "error"
  | "warning"
  | "purple";

function SummaryCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: SummaryTone;
}) {
  const styles = {
    brand:
      "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    error:
      "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
    warning:
      "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    purple:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles[tone]}`}
        >
          <AnalysisIcon />
        </div>

        <div>
          <p className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-white/90">
            {value}
          </p>
        </div>
      </div>

      <p className="mt-4 text-theme-xs text-gray-400">
        {description}
      </p>
    </article>
  );
}

function ActionCard({
  active,
  title,
  description,
  icon,
  tone,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: "brand" | "warning";
  onClick: () => void;
}) {
  const activeClass =
    tone === "brand"
      ? "border-brand-400 bg-brand-50/70 ring-2 ring-brand-500/10 dark:bg-brand-500/[0.08]"
      : "border-warning-400 bg-warning-50/70 ring-2 ring-warning-500/10 dark:bg-warning-500/[0.08]";

  const iconClass =
    tone === "brand"
      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
      : "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${active
        ? activeClass
        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
        }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-theme-sm font-bold text-gray-800 dark:text-white/90">
            {title}
          </p>

          <p className="mt-1 text-theme-xs leading-5 text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function InfoItem({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>

      {secondary && (
        <p className="mt-1 text-[11px] text-gray-400">
          {secondary}
        </p>
      )}
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority?: number | null;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityClass(
        priority
      )}`}
      title={getPriorityDescription(
        priority
      )}
    >
      {getPriorityLabel(
        priority
      )}
    </span>
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
          <span className="ml-1 text-error-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function MobileInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={`px-5 py-4 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${align === "center"
          ? "text-center"
          : align === "right"
            ? "text-right"
            : "text-left"
        }`}
    >
      {children}
    </th>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat ticket Open...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
        <CheckIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        Tidak ada ticket yang perlu dianalisis
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        Ticket baru yang sudah di-assign dan berstatus Open akan muncul di halaman ini.
      </p>
    </div>
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
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path
        d="m20 20-3.5-3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon({
  spinning,
}: {
  spinning: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-4 w-4 ${spinning
        ? "animate-spin"
        : ""
        }`}
    >
      <path
        d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      className="h-6 w-6"
    >
      <circle
        cx="10"
        cy="10"
        r="5"
      />

      <path
        d="m14 14 5 5M8 10h4M10 8v4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      className="h-5 w-5"
    >
      <rect
        x="4"
        y="7"
        width="16"
        height="12"
        rx="2"
      />

      <path
        d="M9 7V5h6v2M4 12h16"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        d="M9.5 8.5v7M14.5 8.5v7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        d="m8.5 12 2.25 2.25 4.75-5"
        strokeLinecap="round"
        strokeLinejoin="round"
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
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </svg>
  );
}

function AnalysisActionIcon() {
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

      <path
        d="m14 14 5 5"
        strokeLinecap="round"
      />

      <path
        d="M8 10h4M10 8v4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6 9 6 6 6-6"
      />
    </svg>
  );
}

const textareaClass =
  "w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-theme-sm leading-6 text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";