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

type DashboardFilter =
  | "ALL"
  | "OPEN"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED";

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
    MASUK: "Masuk",
    OPEN: "Open",
    ON_GOING: "On Going",
    PENDING: "Pending",
    COMPLETED: "Completed",
    CANCELLED: "Dibatalkan",
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
    case "OPEN":
      return "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400";

    case "ON_GOING":
      return "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";

    case "PENDING":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";

    case "COMPLETED":
      return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";

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

function isToday(
  value?: string | null
) {
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

  return (
    date.getFullYear() ===
    now.getFullYear() &&
    date.getMonth() ===
    now.getMonth() &&
    date.getDate() ===
    now.getDate()
  );
}

function getSlaState(
  ticket: Ticket
) {
  if (
    normalizeStatus(
      ticket.status
    ) === "COMPLETED"
  ) {
    return "DONE";
  }

  if (
    !ticket.batasResponse
  ) {
    return "UNSET";
  }

  const deadline =
    new Date(
      ticket.batasResponse
    ).getTime();

  if (
    Number.isNaN(deadline)
  ) {
    return "UNSET";
  }

  const difference =
    deadline - Date.now();

  if (
    difference < 0
  ) {
    return "OVERDUE";
  }

  if (
    difference <=
    2 *
    60 *
    60 *
    1000
  ) {
    return "DUE_SOON";
  }

  return "SAFE";
}

function getRemainingTime(
  value?: string | null
) {
  if (!value) {
    return {
      label:
        "Belum ditentukan",
      className:
        "text-gray-400",
    };
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      label:
        "Tanggal tidak valid",
      className:
        "text-gray-400",
    };
  }

  const difference =
    date.getTime() -
    Date.now();

  const totalMinutes =
    Math.ceil(
      Math.abs(
        difference
      ) / 60_000
    );

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  const duration =
    `${hours > 0
      ? `${hours} jam `
      : ""
    }${minutes} menit`;

  if (
    difference < 0
  ) {
    return {
      label:
        `${duration} terlambat`,
      className:
        "text-error-600 dark:text-error-400",
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
    };
  }

  return {
    label:
      `${duration} tersisa`,
    className:
      "text-success-600 dark:text-success-400",
  };
}

export default function ItHelpdeskDashboard() {
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
    filter,
    setFilter,
  ] =
    useState<DashboardFilter>(
      "ALL"
    );

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
              : "Gagal memuat dashboard IT HelpDesk."
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

  const myTickets =
    useMemo(() => {
      if (!currentUser) {
        return [];
      }

      return tickets.filter(
        (ticket) =>
          ticket.handlerId ===
          currentUser.id
      );
    }, [
      tickets,
      currentUser,
    ]);

  const statistics =
    useMemo(() => {
      const open =
        myTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) === "OPEN"
        ).length;

      const ongoing =
        myTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) === "ON_GOING"
        ).length;

      const pending =
        myTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) === "PENDING"
        ).length;

      const completedToday =
        myTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) ===
            "COMPLETED" &&
            isToday(
              ticket.selesaiPengerjaan ||
              ticket.updatedAt
            )
        ).length;

      const overdue =
        myTickets.filter(
          (ticket) =>
            getSlaState(
              ticket
            ) ===
            "OVERDUE"
        ).length;

      return {
        open,
        ongoing,
        pending,
        completedToday,
        overdue,
      };
    }, [myTickets]);

  const prioritySummary =
    useMemo(() => {
      return [1, 2, 3, 4].map(
        (priority) => ({
          priority,
          label:
            getPriorityLabel(
              priority
            ),
          value:
            myTickets.filter(
              (ticket) =>
                ticket.priority ===
                priority &&
                ![
                  "COMPLETED",
                  "CANCELLED",
                ].includes(
                  normalizeStatus(
                    ticket.status
                  )
                )
            ).length,
        })
      );
    }, [myTickets]);

  const totalActive =
    statistics.open +
    statistics.ongoing +
    statistics.pending;

  const filteredTickets =
    useMemo(() => {
      const activeStatuses =
        filter === "ALL"
          ? [
            "OPEN",
            "ON_GOING",
            "PENDING",
            "COMPLETED",
          ]
          : [filter];

      return [
        ...myTickets,
      ]
        .filter((ticket) =>
          activeStatuses.includes(
            normalizeStatus(
              ticket.status
            )
          )
        )
        .sort((a, b) => {
          const priorityDifference =
            (a.priority || 99) -
            (b.priority || 99);

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference;
          }

          return (
            new Date(
              b.updatedAt ||
              b.waktuKeluhan ||
              0
            ).getTime() -
            new Date(
              a.updatedAt ||
              a.waktuKeluhan ||
              0
            ).getTime()
          );
        })
        .slice(0, 8);
    }, [
      myTickets,
      filter,
    ]);

  const urgentTickets =
    useMemo(() => {
      return [
        ...myTickets,
      ]
        .filter((ticket) =>
          [
            "OPEN",
            "ON_GOING",
            "PENDING",
          ].includes(
            normalizeStatus(
              ticket.status
            )
          )
        )
        .filter(
          (ticket) =>
            ticket.priority ===
            1 ||
            getSlaState(
              ticket
            ) ===
            "OVERDUE" ||
            getSlaState(
              ticket
            ) ===
            "DUE_SOON"
        )
        .sort((a, b) => {
          const priorityDifference =
            (a.priority || 99) -
            (b.priority || 99);

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference;
          }

          const deadlineA =
            a.batasResponse
              ? new Date(
                a.batasResponse
              ).getTime()
              : Number.MAX_SAFE_INTEGER;

          const deadlineB =
            b.batasResponse
              ? new Date(
                b.batasResponse
              ).getTime()
              : Number.MAX_SAFE_INTEGER;

          return (
            deadlineA -
            deadlineB
          );
        })
        .slice(0, 5);
    }, [myTickets]);

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
                Dashboard IT HelpDesk
              </div>

              <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                Selamat datang,{" "}
                {currentUser
                  ?.employee?.nama ||
                  currentUser
                    ?.email ||
                  "IT HelpDesk"} 🙌
              </h1>

              <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Pantau ticket yang perlu dianalisis,
                on going, pending, dan selesai hari ini.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <Alert className="border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </Alert>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Perlu Dianalisis"
            value={
              statistics.open
            }
            description="Ticket Open"
            tone="brand"
            icon={
              <AnalysisIcon />
            }
          />

          <SummaryCard
            label="Sedang Dikerjakan"
            value={
              statistics.ongoing
            }
            description="Ticket On Going"
            tone="purple"
            icon={
              <WorkIcon />
            }
          />

          <SummaryCard
            label="Pending"
            value={
              statistics.pending
            }
            description="Perlu tindak lanjut"
            tone="warning"
            icon={
              <PauseIcon />
            }
          />

          <SummaryCard
            label="Selesai Hari Ini"
            value={
              statistics.completedToday
            }
            description="Ticket Completed"
            tone="success"
            icon={
              <CheckIcon />
            }
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  Ringkasan Pekerjaan
                </h2>

                <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                  Total{" "}
                  {totalActive}{" "}
                  ticket aktif milik Anda.
                </p>
              </div>

              <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                <FilterButton
                  active={
                    filter ===
                    "ALL"
                  }
                  label="Semua"
                  onClick={() =>
                    setFilter(
                      "ALL"
                    )
                  }
                />

                <FilterButton
                  active={
                    filter ===
                    "OPEN"
                  }
                  label="Open"
                  onClick={() =>
                    setFilter(
                      "OPEN"
                    )
                  }
                />

                <FilterButton
                  active={
                    filter ===
                    "ON_GOING"
                  }
                  label="On Going"
                  onClick={() =>
                    setFilter(
                      "ON_GOING"
                    )
                  }
                />
              </div>
            </div>

            {loading ? (
              <LoadingState />
            ) : filteredTickets.length ===
              0 ? (
              <EmptyState
                title="Belum ada ticket"
                description="Ticket yang ditugaskan kepada Anda akan muncul di sini."
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTickets.map(
                  (ticket) => {
                    const employee =
                      getEmployee(
                        ticket
                      );

                    return (
                      <button
                        key={
                          ticket.id
                        }
                        type="button"
                        onClick={() =>
                          setDetailTicket(
                            ticket
                          )
                        }
                        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-sm font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          {getInitial(
                            getReporterName(
                              ticket
                            )
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-theme-xs font-bold text-brand-600 dark:text-brand-400">
                              {
                                ticket.noPelaporan
                              }
                            </p>

                            <StatusBadge
                              status={
                                ticket.status
                              }
                            />

                            <PriorityBadge
                              priority={
                                ticket.priority
                              }
                            />
                          </div>

                          <p className="mt-2 line-clamp-2 text-theme-sm font-semibold leading-6 text-gray-800 dark:text-white/90">
                            {ticket.keluhan ||
                              "Keluhan tidak tersedia"}
                          </p>

                          <p className="mt-2 truncate text-theme-xs text-gray-400">
                            {getReporterName(
                              ticket
                            )}
                            {" · "}
                            {employee?.unitKerja ||
                              "-"}
                          </p>
                        </div>

                        <p className="shrink-0 text-[11px] text-gray-400">
                          {formatDateTime(
                            ticket.updatedAt ||
                            ticket.waktuKeluhan
                          )}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                    Distribusi Priority
                  </h2>

                  <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                    Ticket aktif berdasarkan jabatan.
                  </p>
                </div>

                <span className="rounded-full bg-brand-50 px-3 py-1 text-theme-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {
                    totalActive
                  }{" "}
                  aktif
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {prioritySummary.map(
                  (item) => {
                    const percentage =
                      totalActive > 0
                        ? Math.round(
                          (item.value /
                            totalActive) *
                          100
                        )
                        : 0;

                    return (
                      <div
                        key={
                          item.priority
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <PriorityBadge
                              priority={
                                item.priority
                              }
                            />

                            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                              {
                                item.value
                              }{" "}
                              ticket
                            </span>
                          </div>

                          <span className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                            {
                              percentage
                            }
                            %
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={
                              item.priority ===
                                1
                                ? "h-full rounded-full bg-error-500"
                                : item.priority ===
                                  2
                                  ? "h-full rounded-full bg-warning-500"
                                  : item.priority ===
                                    3
                                    ? "h-full rounded-full bg-purple-500"
                                    : "h-full rounded-full bg-success-500"
                            }
                            style={{
                              width:
                                `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                    Perhatian SLA
                  </h2>

                  <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                    Ticket yang perlu diprioritaskan.
                  </p>
                </div>

                <span className="rounded-full bg-error-50 px-3 py-1 text-theme-xs font-semibold text-error-700 dark:bg-error-500/15 dark:text-error-400">
                  {
                    statistics.overdue
                  }{" "}
                  terlambat
                </span>
              </div>

              {urgentTickets.length ===
                0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-theme-sm text-gray-400 dark:border-gray-700">
                  Tidak ada ticket mendesak.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {urgentTickets.map(
                    (ticket) => {
                      const remaining =
                        getRemainingTime(
                          ticket.batasResponse
                        );

                      return (
                        <button
                          key={
                            ticket.id
                          }
                          type="button"
                          onClick={() =>
                            setDetailTicket(
                              ticket
                            )
                          }
                          className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:bg-brand-500/[0.05]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-theme-xs font-bold text-brand-600 dark:text-brand-400">
                                {
                                  ticket.noPelaporan
                                }
                              </p>

                              <p className="mt-1 line-clamp-1 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                                {ticket.keluhan}
                              </p>
                            </div>

                            <PriorityBadge
                              priority={
                                ticket.priority
                              }
                            />
                          </div>

                          <p
                            className={`mt-3 text-[11px] font-semibold ${remaining.className}`}
                          >
                            {
                              remaining.label
                            }
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          </div>
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
  | "purple"
  | "warning"
  | "success";

function SummaryCard({
  label,
  value,
  description,
  tone,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  tone: SummaryTone;
  icon: React.ReactNode;
}) {
  const styles = {
    brand:
      "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
    warning:
      "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    success:
      "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}
        >
          {icon}
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

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-theme-xs font-semibold transition ${active
          ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
    >
      {label}
    </button>
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

function LoadingState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat dashboard...
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
        <CheckIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
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
      className="h-6 w-6"
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
      className="h-6 w-6"
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
      className="h-6 w-6"
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