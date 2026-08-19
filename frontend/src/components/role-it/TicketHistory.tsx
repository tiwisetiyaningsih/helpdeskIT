"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Ticket } from "@/services/ticket.service";
import { apiFetch } from "@/lib/apiFetch";
import TicketDetail from "./TicketDetail";

const REFRESH_INTERVAL = 15_000;
const ITEMS_PER_PAGE = 10;

type HistoryStatusFilter =
  | "ALL"
  | "COMPLETED"
  | "CANCELLED";

type PriorityFilter =
  | "ALL"
  | "1"
  | "2"
  | "3"
  | "4";

type PeriodFilter =
  | "ALL"
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH";

type SortMode =
  | "NEWEST"
  | "OLDEST"
  | "PRIORITY";

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

function getStatusLabel(
  status?: string
) {
  const labels: Record<string, string> = {
    COMPLETED: "Completed",
  };

  const normalized =
    normalizeStatus(status);

  return (
    labels[normalized] ||
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
    case "COMPLETED":
      return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";

    case "CANCELLED":
      return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";

    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
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

function getCompletionDate(
  ticket: Ticket
) {
  return (
    ticket.selesaiPengerjaan ||
    ticket.updatedAt ||
    ticket.createdAt
  );
}

function isSameDay(
  first: Date,
  second: Date
) {
  return (
    first.getFullYear() ===
    second.getFullYear() &&
    first.getMonth() ===
    second.getMonth() &&
    first.getDate() ===
    second.getDate()
  );
}

function matchesPeriod(
  value: string | null | undefined,
  period: PeriodFilter
) {
  if (period === "ALL") {
    return true;
  }

  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  const now =
    new Date();

  if (
    period === "TODAY"
  ) {
    return isSameDay(
      date,
      now
    );
  }

  if (
    period === "THIS_WEEK"
  ) {
    const start =
      new Date(now);

    const day =
      start.getDay();

    const difference =
      day === 0
        ? -6
        : 1 - day;

    start.setDate(
      start.getDate() +
      difference
    );

    start.setHours(
      0,
      0,
      0,
      0
    );

    const end =
      new Date(start);

    end.setDate(
      start.getDate() + 7
    );

    return (
      date >= start &&
      date < end
    );
  }

  return (
    date.getFullYear() ===
    now.getFullYear() &&
    date.getMonth() ===
    now.getMonth()
  );
}

function getWorkDurationLabel(
  ticket: Ticket
) {
  if (
    ticket.waktuPengerjaan !==
    null &&
    ticket.waktuPengerjaan !==
    undefined
  ) {
    const totalMinutes =
      Number(
        ticket.waktuPengerjaan
      );

    if (
      !Number.isNaN(
        totalMinutes
      )
    ) {
      const hours =
        Math.floor(
          totalMinutes / 60
        );

      const minutes =
        totalMinutes % 60;

      return `${hours > 0
        ? `${hours} jam `
        : ""
        }${minutes} menit`;
    }
  }

  if (
    ticket.mulaiPengerjaan &&
    ticket.selesaiPengerjaan
  ) {
    const start =
      new Date(
        ticket.mulaiPengerjaan
      ).getTime();

    const end =
      new Date(
        ticket.selesaiPengerjaan
      ).getTime();

    if (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      end >= start
    ) {
      const totalMinutes =
        Math.round(
          (end - start) /
          60_000
        );

      const hours =
        Math.floor(
          totalMinutes / 60
        );

      const minutes =
        totalMinutes % 60;

      return `${hours > 0
        ? `${hours} jam `
        : ""
        }${minutes} menit`;
    }
  }

  return "-";
}

export default function TicketHistoryManagement() {
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
    statusFilter,
    setStatusFilter,
  ] =
    useState<HistoryStatusFilter>(
      "ALL"
    );

  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<PriorityFilter>(
      "ALL"
    );

  const [
    periodFilter,
    setPeriodFilter,
  ] =
    useState<PeriodFilter>(
      "ALL"
    );

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "NEWEST"
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
    error,
    setError,
  ] = useState("");

  const [
    detailTicket,
    setDetailTicket,
  ] =
    useState<Ticket | null>(
      null
    );

  const loadData =
    useCallback(
      async (
        showLoading = false
      ) => {
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
            apiFetch("/tickets", {
              cache: "no-store",
            }),
            apiFetch("/auth/me", {
              cache: "no-store",
            }),
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
              : "Gagal memuat riwayat ticket."
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

  const historyTickets =
    useMemo(() => {
      if (!currentUser) {
        return [];
      }

      return tickets.filter(
        (ticket) => {
          const status =
            normalizeStatus(
              ticket.status
            );

          return (
            ticket.handlerId ===
            currentUser.id &&
            [
              "COMPLETED",
              "CANCELLED",
            ].includes(status)
          );
        }
      );
    }, [
      tickets,
      currentUser,
    ]);

  const statistics =
    useMemo(() => {
      const completed =
        historyTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) ===
            "COMPLETED"
        ).length;

      const cancelled =
        historyTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) ===
            "CANCELLED"
        ).length;

      const completedToday =
        historyTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) ===
            "COMPLETED" &&
            matchesPeriod(
              getCompletionDate(
                ticket
              ),
              "TODAY"
            )
        ).length;

      const completedMonth =
        historyTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) ===
            "COMPLETED" &&
            matchesPeriod(
              getCompletionDate(
                ticket
              ),
              "THIS_MONTH"
            )
        ).length;

      return {
        total:
          historyTickets.length,
        completed,
        cancelled,
        completedToday,
        completedMonth,
      };
    }, [historyTickets]);

  const filteredTickets =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return [
        ...historyTickets,
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
                ticket.analisaAwal ||
                "",
                ticket.hasilAnalisa ||
                "",
                ticket.keterangan ||
                "",
                ticket.catatan ||
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
                getStatusLabel(
                  ticket.status
                ),
              ]
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !keyword ||
              searchableText.includes(
                keyword
              );

            const matchesStatus =
              statusFilter ===
              "ALL" ||
              normalizeStatus(
                ticket.status
              ) ===
              statusFilter;

            const matchesPriority =
              priorityFilter ===
              "ALL" ||
              ticket.priority ===
              Number(
                priorityFilter
              );

            const matchesDate =
              matchesPeriod(
                getCompletionDate(
                  ticket
                ),
                periodFilter
              );

            return (
              matchesSearch &&
              matchesStatus &&
              matchesPriority &&
              matchesDate
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
                getCompletionDate(
                  ticketA
                ) || 0
              ).getTime();

            const dateB =
              new Date(
                getCompletionDate(
                  ticketB
                ) || 0
              ).getTime();

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
              "PRIORITY"
            ) {
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
            }

            return dateB - dateA;
          }
        );
    }, [
      historyTickets,
      search,
      statusFilter,
      priorityFilter,
      periodFilter,
      sortMode,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    priorityFilter,
    periodFilter,
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

  return (
    <>
      <div className="space-y-5 pb-8">
        <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-7 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03] sm:px-8">
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
                Riwayat Ticket
              </h1>

              <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Lihat seluruh ticket yang sudah selesai oleh Anda.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <Alert className="border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </Alert>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Total Riwayat"
            value={
              statistics.total
            }
            description="Completed"
            tone="brand"
          />

          <SummaryCard
            label="Completed"
            value={
              statistics.completed
            }
            description="Ticket selesai"
            tone="success"
          />

          <SummaryCard
            label="Selesai Hari Ini"
            value={
              statistics.completedToday
            }
            description={`${statistics.completedMonth} selesai bulan ini`}
            tone="purple"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  Daftar Riwayat
                </h2>

                <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                  Menampilkan{" "}
                  {
                    filteredTickets.length
                  }{" "}
                  dari{" "}
                  {
                    historyTickets.length
                  }{" "}
                  ticket.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto">
                <div className="relative w-full sm:w-[280px]">
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
                    placeholder="Cari riwayat ticket..."
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-theme-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div className="relative w-full sm:w-[155px]">
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value as HistoryStatusFilter
                      )
                    }
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-11 text-theme-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="ALL">
                      Semua Status
                    </option>

                    <option value="COMPLETED">
                      Completed
                    </option>
                  </select>

                  <ChevronDownIcon />
                </div>

                <div className="relative w-full sm:w-[165px]">
                  <select
                    value={periodFilter}
                    onChange={(event) =>
                      setPeriodFilter(
                        event.target.value as PeriodFilter
                      )
                    }
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-11 text-theme-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="ALL">
                      Semua Periode
                    </option>

                    <option value="TODAY">
                      Hari Ini
                    </option>

                    <option value="THIS_WEEK">
                      Minggu Ini
                    </option>

                    <option value="THIS_MONTH">
                      Bulan Ini
                    </option>
                  </select>

                  <ChevronDownIcon />
                </div>

                <div className="relative w-full sm:w-[165px]">
                  <select
                    value={priorityFilter}
                    onChange={(event) =>
                      setPriorityFilter(
                        event.target.value as PriorityFilter
                      )
                    }
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-11 text-theme-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
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

                <div className="relative w-full sm:w-[125px]">
                  <select
                    value={sortMode}
                    onChange={(event) =>
                      setSortMode(
                        event.target.value as SortMode
                      )
                    }
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-11 text-theme-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="NEWEST">
                      Terbaru
                    </option>

                    <option value="OLDEST">
                      Terlama
                    </option>

                    <option value="PRIORITY">
                      Priority
                    </option>
                  </select>

                  <ChevronDownIcon />
                </div>
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
                <table className="w-full min-w-[1120px] table-fixed">
                  <colgroup>
                    <col className="w-[15%]" />
                    <col className="w-[17%]" />
                    <col className="w-[25%]" />
                    <col className="w-[11%]" />
                    <col className="w-[15%]" />
                    <col className="w-[9%]" />
                    <col className="w-[8%]" />
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
                        Pekerjaan
                      </TableHeader>
                      <TableHeader>
                        Status
                      </TableHeader>
                      <TableHeader>
                        Selesai
                      </TableHeader>
                      <TableHeader>
                        Durasi
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

                        return (
                          <tr
                            key={
                              ticket.id
                            }
                            className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-5 align-top">
                              <p className="break-all text-theme-xs font-bold text-brand-600 dark:text-brand-400">
                                {ticket.noPelaporan}
                              </p>

                              <p className="mt-2 text-[10px] text-gray-400">
                                Dibuat:{" "}
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

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-theme-xs text-gray-400">
                                  {ticket.kategoriKeluhan ||
                                    "Kategori belum ditentukan"}
                                </span>

                                <PriorityBadge
                                  priority={
                                    ticket.priority
                                  }
                                />
                              </div>

                              {ticket.keterangan && (
                                <p className="mt-2 line-clamp-1 text-[11px] text-gray-500 dark:text-gray-400">
                                  Hasil:{" "}
                                  {
                                    ticket.keterangan
                                  }
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-5 align-top">
                              <StatusBadge
                                status={
                                  ticket.status
                                }
                              />
                            </td>

                            <td className="px-5 py-5 align-top">
                              <p className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                                {formatDateTime(
                                  getCompletionDate(
                                    ticket
                                  )
                                )}
                              </p>
                            </td>

                            <td className="px-5 py-5 align-top">
                              <p className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                                {getWorkDurationLabel(
                                  ticket
                                )}
                              </p>
                            </td>

                            <td className="px-5 py-5 align-top">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  title="Lihat detail"
                                  aria-label={`Lihat detail ${ticket.noPelaporan}`}
                                  onClick={() =>
                                    setDetailTicket(
                                      ticket
                                    )
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                  <EyeIcon />
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
                  (ticket) => (
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

                        <StatusBadge
                          status={
                            ticket.status
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
                          label="Priority"
                          value={getPriorityLabel(
                            ticket.priority
                          )}
                        />

                        <MobileInfo
                          label="Selesai"
                          value={formatDateTime(
                            getCompletionDate(
                              ticket
                            )
                          )}
                        />

                        <MobileInfo
                          label="Durasi"
                          value={getWorkDurationLabel(
                            ticket
                          )}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setDetailTicket(
                            ticket
                          )
                        }
                        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-theme-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      >
                        <EyeIcon />
                        Lihat Detail
                      </button>
                    </article>
                  )
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
    </>
  );
}

type SummaryTone =
  | "brand"
  | "success"
  | "purple"
  | "error";

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

    success:
      "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",

    purple:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",

    error:
      "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  };

  const valueStyles = {
    brand:
      "text-brand-600 dark:text-brand-400",

    success:
      "text-success-700 dark:text-success-400",

    purple:
      "text-purple-600 dark:text-purple-400",

    error:
      "text-error-600 dark:text-error-400",
  };

  return (
    <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[tone]}`}
      >
        <HistoryIcon />
      </div>

      <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 text-3xl font-bold ${valueStyles[tone]}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-gray-400">
        {description}
      </p>
    </article>
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
    >
      {getPriorityLabel(
        priority
      )}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(
        status
      )}`}
    >
      {getStatusLabel(
        status
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
        Memuat riwayat ticket...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
        <HistoryIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        Riwayat ticket tidak ditemukan
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        Belum ada ticket selesai atau data tidak sesuai dengan filter yang dipilih.
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

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12a8.25 8.25 0 1 0 2.416-5.834L3.75 8.582M3.75 4.5v4.082h4.082M12 7.5V12l3 1.5"
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
      className="h-[18px] w-[18px]"
    >
      <path
        d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"
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

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
    >
      <path
        d="m6 9 6 6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}