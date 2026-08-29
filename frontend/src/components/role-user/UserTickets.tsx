"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import TicketDetail from "./TicketDetail";
import type { Ticket } from "@/services/ticket.service";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/config";

const ITEMS_PER_PAGE = 10;


type PriorityValue =
  | string
  | number
  | {
    id?: number;
    name?: string;
    level?: string;
  }
  | null;

// type Ticket = {
//   id: number;
//   noPelaporan?: string;
//   keluhan?: string;
//   status?: string;
//   priority?: PriorityValue;
//   kategoriKeluhan?: string | null;
//   waktuKeluhan?: string;
//   createdAt?: string;
//   updatedAt?: string;
// };

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

type StatusValue =
  | "MASUK"
  | "OPEN"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED";

type StatusFilter =
  | "ALL"
  | StatusValue;

type StatisticColor =
  | "blue"
  | "gray"
  | "purple"
  | "orange"
  | "green";

async function parseJsonResponse<T>(
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
      "Response backend bukan JSON:",
      responseText
    );

    throw new Error(
      "Backend tidak mengembalikan JSON. Periksa URL backend dan endpoint ticket."
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
): StatusValue {
  const normalized =
    String(status || "MASUK")
      .trim()
      .toUpperCase()
      .replace(/[ -]+/g, "_");

  if (
    [
      "BARU",
      "NEW",
      "INCOMING",
    ].includes(normalized)
  ) {
    return "MASUK";
  }

  if (
    [
      "WAITING",
      "ASSIGNED",
    ].includes(normalized)
  ) {
    return "OPEN";
  }

  if (
    [
      "IN_PROGRESS",
      "PROCESS",
      "PROGRESS",
      "ONGOING",
      "DIPROSES",
    ].includes(normalized)
  ) {
    return "ON_GOING";
  }

  if (
    [
      "RESOLVED",
      "CLOSED",
      "SELESAI",
    ].includes(normalized)
  ) {
    return "COMPLETED";
  }

  if (
    [
      "REJECTED",
      "DITOLAK",
    ].includes(normalized)
  ) {
    return "CANCELLED";
  }

  if (
    [
      "MASUK",
      "OPEN",
      "ON_GOING",
      "PENDING",
      "COMPLETED",
      "CANCELLED",
    ].includes(normalized)
  ) {
    return normalized as StatusValue;
  }

  return "MASUK";
}

function formatStatus(
  status?: string
) {
  const labels: Record<
    StatusValue,
    string
  > = {
    MASUK: "Masuk",
    OPEN: "Open",
    ON_GOING: "On Going",
    PENDING: "Pending",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };

  return labels[
    normalizeStatus(status)
  ];
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
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getPriorityValue(
  priority?: PriorityValue
) {
  if (
    priority === null ||
    priority === undefined
  ) {
    return "";
  }

  if (
    typeof priority ===
    "object"
  ) {
    return (
      priority.name ||
      priority.level ||
      String(
        priority.id || ""
      )
    );
  }

  return String(priority);
}

function formatPriority(
  priority?: PriorityValue
) {
  const normalized =
    getPriorityValue(priority)
      .trim()
      .toUpperCase();

  const labels: Record<
    string,
    string
  > = {
    "1": "Direksi",
    "2": "VP/EVP",
    "3": "Manager",
    "4": "Staff",
    CRITICAL:
      "Sangat Tinggi",
    URGENT:
      "Sangat Tinggi",
    HIGH: "Tinggi",
    MEDIUM: "Sedang",
    LOW: "Rendah",
  };

  return (
    labels[normalized] ||
    "Belum ditentukan"
  );
}

function getPriorityClass(
  priority?: PriorityValue
) {
  const normalized =
    getPriorityValue(priority)
      .trim()
      .toUpperCase();

  if (
    [
      "1",
      "CRITICAL",
      "URGENT",
    ].includes(normalized)
  ) {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }

  if (
    [
      "2",
      "HIGH",
    ].includes(normalized)
  ) {
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
  }

  if (
    [
      "3",
      "MEDIUM",
    ].includes(normalized)
  ) {
    return "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400";
  }

  if (
    [
      "4",
      "LOW",
    ].includes(normalized)
  ) {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

function getTicketCode(
  ticket: Ticket
) {
  return (
    ticket.noPelaporan ||
    `TCK-${String(
      ticket.id
    ).padStart(5, "0")}`
  );
}

function formatDate(
  dateValue?: string
) {
  if (!dateValue) {
    return "-";
  }

  const date =
    new Date(dateValue);

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
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Asia/Jakarta",
    }
  ).format(date);
}

export default function UserTickets() {
  const router =
    useRouter();

  const [detailTicket, setDetailTicket] =
    useState<Ticket | null>(null);

  const [
    tickets,
    setTickets,
  ] =
    useState<Ticket[]>([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL"
    );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const getTickets =
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

        try {
          setIsLoading(true);
          setError("");

          const response =
            await apiFetch(
              `${API_URL}/tickets/my`,
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
            await parseJsonResponse<TicketResponse>(
              response
            );

          if (
            !response.ok ||
            data.success ===
            false
          ) {
            throw new Error(
              data.message ||
              "Gagal mengambil riwayat keluhan."
            );
          }

          setTickets(
            extractTickets(data)
          );
        } catch (
        loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Terjadi kesalahan saat mengambil riwayat keluhan."
          );
        } finally {
          setIsLoading(
            false
          );
        }
      };

    void getTickets();
  }, [router]);

  const ticketStatistics =
    useMemo(() => {
      return {
        total:
          tickets.length,

        masuk:
          tickets.filter(
            (ticket) =>
              normalizeStatus(
                ticket.status
              ) === "MASUK"
          ).length,

        open:
          tickets.filter(
            (ticket) =>
              normalizeStatus(
                ticket.status
              ) === "OPEN"
          ).length,

        ongoing:
          tickets.filter(
            (ticket) =>
              normalizeStatus(
                ticket.status
              ) ===
              "ON_GOING"
          ).length,

        pending:
          tickets.filter(
            (ticket) =>
              normalizeStatus(
                ticket.status
              ) === "PENDING"
          ).length,

        completed:
          tickets.filter(
            (ticket) =>
              normalizeStatus(
                ticket.status
              ) ===
              "COMPLETED"
          ).length,
      };
    }, [tickets]);

  const filteredTickets =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return [
        ...tickets,
      ]
        .filter(
          (ticket) => {
            const searchableText =
              [
                getTicketCode(
                  ticket
                ),
                ticket.keluhan ||
                "",
                ticket.kategoriKeluhan ||
                "",
                formatStatus(
                  ticket.status
                ),
                formatPriority(
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

            const matchesStatus =
              statusFilter ===
              "ALL" ||
              normalizeStatus(
                ticket.status
              ) ===
              statusFilter;

            return (
              matchesSearch &&
              matchesStatus
            );
          }
        )
        .sort(
          (ticketA, ticketB) => {
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

            return (
              dateB - dateA
            );
          }
        );
    }, [
      tickets,
      search,
      statusFilter,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
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
    <div className="space-y-5 pb-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-6 py-7 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:px-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-brand-50 dark:bg-brand-500/10" />

          <div className="absolute right-28 top-4 h-32 w-32 rounded-full bg-brand-100/60 dark:bg-brand-500/10" />

          <div
            className="absolute left-5 top-2 h-24 w-32 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(70,95,255,0.28) 1.4px, transparent 1.4px)",
              backgroundSize: "14px 14px",
            }}
          />
        </div>

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90 sm:text-3xl">
              Riwayat Keluhan
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Pantau status dan perkembangan seluruh keluhan yang sudah Anda kirim
              ke tim IT.
            </p>
          </div>

          <Link
            href="/user/tickets/create"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white shadow-theme-sm transition hover:bg-brand-600"
          >
            <PlusIcon />
            Buat Keluhan
          </Link>
        </div>
      </section>

      {/* Statistik */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatisticCard
          label="Total Keluhan"
          value={
            ticketStatistics.total
          }
          description="Seluruh keluhan"
          color="blue"
          icon={
            <DocumentIcon />
          }
        />

        <StatisticCard
          label="Masuk"
          value={
            ticketStatistics.masuk
          }
          description="Menunggu admin"
          color="gray"
          icon={<InboxIcon />}
        />

        <StatisticCard
          label="Open"
          value={
            ticketStatistics.open
          }
          description="Sudah ditugaskan"
          color="blue"
          icon={<ClockIcon />}
        />

        <StatisticCard
          label="On Going"
          value={
            ticketStatistics.ongoing
          }
          description="Sedang dikerjakan"
          color="purple"
          icon={<ProcessIcon />}
        />

        <StatisticCard
          label="Pending"
          value={
            ticketStatistics.pending
          }
          description="Ditunda sementara"
          color="orange"
          icon={<PauseIcon />}
        />

        <StatisticCard
          label="Selesai"
          value={
            ticketStatistics.completed
          }
          description="Sudah diselesaikan"
          color="green"
          icon={<CheckIcon />}
        />
      </section>

      {/* Daftar Keluhan */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <DocumentIcon />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Daftar Keluhan
              </h2>

              <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
                Menampilkan{" "}
                {
                  filteredTickets.length
                }{" "}
                dari{" "}
                {tickets.length}{" "}
                keluhan.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <div className="relative w-full sm:w-[340px]">
              <SearchIcon />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Cari nomor ticket, keluhan, atau kategori..."
                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="relative w-full sm:w-[160px]">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as StatusFilter
                  )
                }
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-10 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <option value="ALL">
                  Semua Status
                </option>

                <option value="MASUK">
                  Masuk
                </option>

                <option value="OPEN">
                  Open
                </option>

                <option value="ON_GOING">
                  On Going
                </option>

                <option value="PENDING">
                  Pending
                </option>

                <option value="COMPLETED">
                  Selesai
                </option>
              </select>

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
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : filteredTickets.length ===
          0 ? (
          <EmptyState
            hasTickets={
              tickets.length > 0
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-gray-50/80 dark:bg-gray-900">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <TableHeader>
                      No. Ticket
                    </TableHeader>

                    <TableHeader>
                      Keluhan
                    </TableHeader>

                    <TableHeader>
                      Priority
                    </TableHeader>

                    <TableHeader>
                      Status
                    </TableHeader>

                    <TableHeader>
                      Tanggal
                    </TableHeader>

                    <TableHeader>
                      Aksi
                    </TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedTickets.map(
                    (ticket) => (
                      <tr
                        key={
                          ticket.id
                        }
                        className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-4 align-middle">
                          <Link
                            href={`/user/tickets/${ticket.id}`}
                            className="break-all text-theme-xs font-bold text-brand-600 transition hover:underline dark:text-brand-400"
                          >
                            {getTicketCode(
                              ticket
                            )}
                          </Link>
                        </td>

                        <td className="px-5 py-4 align-middle">
                          <p className="max-w-[340px] line-clamp-2 text-theme-sm font-bold text-gray-800 dark:text-white/90">
                            {ticket.keluhan ||
                              "Keluhan tidak tersedia"}
                          </p>

                          <p className="mt-1 text-theme-xs text-gray-400">
                            Kategori:{" "}
                            {ticket.kategoriKeluhan ||
                              "Belum ditentukan"}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-middle">
                          <PriorityBadge
                            priority={
                              ticket.priority
                            }
                          />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-middle">
                          <StatusBadge
                            status={
                              ticket.status
                            }
                          />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-middle text-theme-sm text-gray-500 dark:text-gray-400">
                          {formatDate(
                            ticket.waktuKeluhan ||
                            ticket.createdAt
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-middle">
                          <button
                            type="button"
                            onClick={() => setDetailTicket(ticket)}
                            title="Lihat Detail"
                            aria-label="Lihat Detail"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                          >
                            <EyeIcon />
                          </button>
                        </td>

                        {/* <td className="px-3 py-4 text-center align-middle">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          >
                            <MoreIcon />
                          </button>
                        </td> */}
                      </tr>
                    )
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
                          {getTicketCode(
                            ticket
                          )}
                        </p>

                        <h3 className="mt-2 line-clamp-2 text-theme-sm font-semibold leading-6 text-gray-800 dark:text-white/90">
                          {ticket.keluhan ||
                            "Keluhan tidak tersedia"}
                        </h3>

                        <p className="mt-1 text-theme-xs text-gray-400">
                          Kategori:{" "}
                          {ticket.kategoriKeluhan ||
                            "Belum ditentukan"}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          ticket.status
                        }
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <PriorityBadge
                        priority={
                          ticket.priority
                        }
                      />

                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                        {formatDate(
                          ticket.waktuKeluhan ||
                          ticket.createdAt
                        )}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                      <p className="text-theme-xs text-gray-400">Ketuk untuk detail lengkap</p>

                      <button
                        type="button"
                        onClick={() => setDetailTicket(ticket)}
                        title="Lihat Detail"
                        aria-label="Lihat Detail"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      >
                        <EyeIcon />
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          </>
        )}

        {!isLoading &&
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                >
                  ‹
                </button>

                {Array.from(
                  {
                    length:
                      totalPages,
                  },
                  (
                    _,
                    index
                  ) =>
                    index + 1
                ).map(
                  (page) => (
                    <button
                      key={
                        page
                      }
                      type="button"
                      onClick={() =>
                        setCurrentPage(
                          page
                        )
                      }
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-theme-xs font-semibold ${page ===
                        currentPage
                        ? "border-brand-500 bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400"
                        : "border-transparent text-gray-500 hover:border-gray-200 dark:text-gray-400"
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}

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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                >
                  ›
                </button>

                <div className="ml-2 hidden h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-theme-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 sm:flex">
                  {
                    ITEMS_PER_PAGE
                  }{" "}
                  / halaman
                </div>
              </div>
            </div>
          )}
      </section>
      {detailTicket && (
        <TicketDetail
          ticket={detailTicket}
          onClose={() => setDetailTicket(null)}
        />
      )}
    </div>
  );
}

function StatisticCard({
  label,
  value,
  description,
  color,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  color: StatisticColor;
  icon: React.ReactNode;
}) {
  const styles: Record<
    StatisticColor,
    {
      icon: string;
      value: string;
    }
  > = {
    blue: {
      icon:
        "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      value:
        "text-brand-600 dark:text-brand-400",
    },

    gray: {
      icon:
        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      value:
        "text-gray-900 dark:text-white/90",
    },

    purple: {
      icon:
        "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
      value:
        "text-purple-600 dark:text-purple-400",
    },

    orange: {
      icon:
        "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
      value:
        "text-warning-700 dark:text-warning-400",
    },

    green: {
      icon:
        "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
      value:
        "text-success-700 dark:text-success-400",
    },
  };

  const currentStyle = styles[color];

  return (
    <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${currentStyle.icon}`}
      >
        {icon}
      </div>

      <p className="mt-4 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p className={`mt-1 text-3xl font-bold ${currentStyle.value}`}>
        {value}
      </p>

      <p className="mt-2 truncate text-xs text-gray-400">
        {description}
      </p>
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getStatusClass(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {formatStatus(status)}
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority?: PriorityValue;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getPriorityClass(
        priority
      )}`}
    >
      <PriorityIcon />

      {formatPriority(priority)}
    </span>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </th>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat riwayat keluhan...
      </p>
    </div>
  );
}

function EmptyState({
  hasTickets,
}: {
  hasTickets: boolean;
}) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <DocumentIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        Keluhan tidak ditemukan
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        {hasTickets
          ? "Tidak ada keluhan yang sesuai dengan pencarian atau filter yang dipilih."
          : "Anda belum pernah membuat keluhan."}
      </p>

      {!hasTickets && (
        <Link
          href="/user/tickets/create"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-semibold text-white hover:bg-brand-600"
        >
          Buat Keluhan Pertama
        </Link>
      )}
    </div>
  );
}

function PlusIcon() {
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
        d="M12 5v14M5 12h14"
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
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path
        strokeLinecap="round"
        d="m20 20-3.5-3.5"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M7 12h10M10 18h4"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="5"
        r="1.5"
      />

      <circle
        cx="12"
        cy="12"
        r="1.5"
      />

      <circle
        cx="12"
        cy="19"
        r="1.5"
      />
    </svg>
  );
}

function PriorityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-3.5 w-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m0 3.75h.008v.008H12V16.5ZM4.5 19.5h15L12 4.5l-7.5 15Z"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625A3.375 3.375 0 0 0 16.125 8.25h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H6.375A1.125 1.125 0 0 0 5.25 3.375v17.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V6.75L13.5 2.25Z"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75 6.75 4.5h10.5l2.25 8.25m-15 0v5.625A1.875 1.875 0 0 0 6.375 20.25h11.25a1.875 1.875 0 0 0 1.875-1.875V12.75h-4.125a3.375 3.375 0 0 1-6.75 0H4.5Z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-6 w-6"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        d="M12 7.5V12l3 2"
      />
    </svg>
  );
}

function ProcessIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12a7.5 7.5 0 0 1 12.804-5.304L19.5 9m0 0V4.5M19.5 9H15m4.5 3a7.5 7.5 0 0 1-12.804 5.304L4.5 15m0 0v4.5M4.5 15H9"
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
      strokeWidth="1.7"
      className="h-6 w-6"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        d="M9.5 8.5v7M14.5 8.5v7"
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
      strokeWidth="1.7"
      className="h-6 w-6"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.5 12 2.25 2.25 4.75-5"
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
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}