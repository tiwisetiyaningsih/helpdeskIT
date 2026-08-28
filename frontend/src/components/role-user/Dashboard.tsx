"use client";


import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import TicketDetail from "./TicketDetail";
import type { Ticket } from "@/services/ticket.service";
import { apiFetch } from "@/lib/apiFetch";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const REFRESH_INTERVAL = 10_000;

/* =========================
 * TYPES
 * ========================= */

type LoggedInUser = {
  id?: number;
  nama?: string;
  name?: string;
  email?: string;
  role?: string;
  employee?: {
    nama?: string;
    nik?: string;
    jabatan?: string;
    unitKerja?: string;
    jobTitle?: string | null;
  } | null;
};

type TicketEmployee = {
  nama?: string;
  nik?: string;
  jabatan?: string;
  unitKerja?: string;
  jobTitle?: string | null;
};

type TicketUser = {
  id?: number;
  email?: string;
  employee?: TicketEmployee | null;
};

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
//   handlerId?: number | null;
//   handler?: TicketUser | null;
//   waktuKeluhan?: string;
//   createdAt?: string;
//   updatedAt?: string;
// };

type ProfileResponse = {
  success?: boolean;
  message?: string;
  user?: LoggedInUser;
  data?: LoggedInUser;
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

type StatusValue =
  | "MASUK"
  | "OPEN"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED";

type StatColor = "blue" | "gray" | "purple" | "orange" | "green";

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  color: StatColor;
};

/* =========================
 * API HELPERS
 * ========================= */

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const responseText = await response.text();
    console.error("Response backend bukan JSON:", responseText);
    throw new Error("Backend tidak mengembalikan JSON.");
  }

  return response.json() as Promise<T>;
}

function extractTickets(responseData: TicketResponse): Ticket[] {
  if (Array.isArray(responseData.tickets)) return responseData.tickets;
  if (Array.isArray(responseData.data)) return responseData.data;

  if (responseData.data && typeof responseData.data === "object") {
    if (Array.isArray(responseData.data.tickets)) {
      return responseData.data.tickets;
    }

    if (Array.isArray(responseData.data.items)) {
      return responseData.data.items;
    }
  }

  return [];
}

/* =========================
 * FORMATTERS
 * ========================= */

function normalizeStatus(status?: string): StatusValue {
  const normalized = String(status || "MASUK")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");

  if (["BARU", "NEW", "INCOMING"].includes(normalized)) return "MASUK";
  if (["WAITING", "ASSIGNED"].includes(normalized)) return "OPEN";

  if (
    ["IN_PROGRESS", "PROCESS", "PROGRESS", "ONGOING", "DIPROSES"].includes(
      normalized
    )
  ) {
    return "ON_GOING";
  }

  if (["RESOLVED", "CLOSED", "SELESAI"].includes(normalized)) {
    return "COMPLETED";
  }

  if (normalized === "PENDING") return "PENDING";

  if (["CANCELLED", "REJECTED", "DITOLAK"].includes(normalized)) {
    return "CANCELLED";
  }

  if (["MASUK", "OPEN", "ON_GOING", "COMPLETED"].includes(normalized)) {
    return normalized as StatusValue;
  }

  return "MASUK";
}

function getStatusLabel(status?: string) {
  const labels: Record<StatusValue, string> = {
    MASUK: "Masuk",
    OPEN: "Open",
    ON_GOING: "On Going",
    PENDING: "Pending",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  };

  return labels[normalizeStatus(status)];
}

function getStatusDescription(status?: string) {
  const descriptions: Record<StatusValue, string> = {
    MASUK: "Menunggu penugasan dari admin",
    OPEN: "Sudah ditugaskan kepada IT",
    ON_GOING: "Sedang dikerjakan",
    PENDING: "Ditunda sementara",
    COMPLETED: "Selesai dikerjakan",
    CANCELLED: "Keluhan dibatalkan",
  };

  return descriptions[normalizeStatus(status)];
}

function getStatusClass(status?: string) {
  switch (normalizeStatus(status)) {
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
  }
}

function getTicketCode(ticket: Ticket) {
  return ticket.noPelaporan || `TCK-${String(ticket.id).padStart(5, "0")}`;
}

function getTicketTitle(ticket: Ticket) {
  return ticket.keluhan || "Keluhan tidak tersedia";
}

function getHandlerName(ticket: Ticket) {
  return (
    ticket.handler?.employee?.nama ||
    ticket.handler?.email ||
    "Belum ditugaskan"
  );
}

function formatDate(dateValue?: string) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function getPriorityValue(priority?: PriorityValue) {
  if (priority === null || priority === undefined) return "";

  if (typeof priority === "object") {
    return priority.name || priority.level || String(priority.id || "");
  }

  return String(priority);
}

function getPriorityNumber(priority?: PriorityValue) {
  const normalized = getPriorityValue(priority).trim().toUpperCase();

  if (["1", "CRITICAL", "URGENT"].includes(normalized)) return 1;
  if (["2", "HIGH"].includes(normalized)) return 2;
  if (["3", "MEDIUM"].includes(normalized)) return 3;
  if (["4", "LOW"].includes(normalized)) return 4;

  return 0;
}

function getPrioritySource(priority?: PriorityValue) {
  return (
    {
      1: "Direksi",
      2: "VP/EVP",
      3: "Manager",
      4: "Staff",
    } as Record<number, string>
  )[getPriorityNumber(priority)] || "Belum ditentukan";
}

function getPriorityClass(priority?: PriorityValue) {
  switch (getPriorityNumber(priority)) {
    case 1:
      return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
    case 2:
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
    case 3:
      return "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400";
    case 4:
      return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
}

/* =========================
 * PAGE
 * ========================= */

export default function Dashboard() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);

  const loadDashboardData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const [profileResponse, ticketResponse] = await Promise.all([
        apiFetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }),
        apiFetch(`${API_URL}/tickets/my`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }),
      ]);

      const profileData =
        await parseJsonResponse<ProfileResponse>(profileResponse);
      const ticketData =
        await parseJsonResponse<TicketResponse>(ticketResponse);

      const profile = profileData.user || profileData.data;

      if (!profileResponse.ok || !profile) {
        throw new Error(profileData.message || "Gagal mengambil data pengguna.");
      }

      if (!ticketResponse.ok || ticketData.success === false) {
        throw new Error(ticketData.message || "Gagal mengambil data keluhan.");
      }

      setUser(profile);
      setTickets(extractTickets(ticketData));
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Terjadi kesalahan saat memuat dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData(true);

    const intervalId = window.setInterval(() => {
      void loadDashboardData(false);
    }, REFRESH_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [loadDashboardData]);

  const statistics = useMemo(
    () => ({
      total: tickets.length,
      masuk: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "MASUK"
      ).length,
      open: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "OPEN"
      ).length,
      ongoing: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "ON_GOING"
      ).length,
      pending: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "PENDING"
      ).length,
      completed: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "COMPLETED"
      ).length,
    }),
    [tickets]
  );

  const latestTickets = useMemo(() => {
    return [...tickets]
      .sort((a, b) => {
        const dateA = new Date(a.waktuKeluhan || a.createdAt || 0).getTime();
        const dateB = new Date(b.waktuKeluhan || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [tickets]);

  const userName =
    user?.employee?.nama || user?.nama || user?.name || "Employee";

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-5 pb-8">
      {/* Welcome */}
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
              Halo, {userName} <span aria-hidden="true">👋</span>
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              Buat keluhan IT dan pantau proses penugasan, pengerjaan, hingga
              penyelesaian keluhan Anda.
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

      {error && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-error-200 bg-error-50 px-5 py-4 dark:border-error-500/30 dark:bg-error-500/10 sm:flex-row sm:items-center">
          <p className="text-sm font-medium text-error-700 dark:text-error-400">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void loadDashboardData(true)}
            className="text-left text-sm font-semibold text-error-700 underline dark:text-error-400"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Statistics */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="Total Keluhan"
          value={statistics.total}
          description="Seluruh keluhan"
          color="blue"
          icon={<DocumentIcon />}
        />
        <StatCard
          title="Masuk"
          value={statistics.masuk}
          description="Menunggu admin"
          color="gray"
          icon={<InboxIcon />}
        />
        <StatCard
          title="Open"
          value={statistics.open}
          description="Sudah ditugaskan"
          color="blue"
          icon={<OpenIcon />}
        />
        <StatCard
          title="On Going"
          value={statistics.ongoing}
          description="Sedang dikerjakan"
          color="purple"
          icon={<ProcessIcon />}
        />
        <StatCard
          title="Pending"
          value={statistics.pending}
          description="Ditunda sementara"
          color="orange"
          icon={<PauseIcon />}
        />
        <StatCard
          title="Selesai"
          value={statistics.completed}
          description="Sudah diselesaikan"
          color="green"
          icon={<CheckIcon />}
        />
      </section>

      {/* Latest Tickets */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <DocumentIcon />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Keluhan Terbaru
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Lima keluhan terakhir yang Anda buat.
              </p>
            </div>
          </div>

          <Link
            href="/user/tickets"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
          >
            Lihat semua
            <ChevronRightIcon />
          </Link>
        </div>

        {latestTickets.length === 0 ? (
          <EmptyTicket />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px] table-fixed">
                <colgroup>
                  <col className="w-[17%]" />
                  <col className="w-[25%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                </colgroup>

                <thead className="bg-gray-50/80 dark:bg-gray-900">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <TableHeader>Nomor Ticket</TableHeader>
                    <TableHeader>Keluhan</TableHeader>
                    <TableHeader>PIC</TableHeader>
                    <TableHeader>Priority</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader align="center">Aksi</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {latestTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="transition hover:bg-brand-50/30 dark:hover:bg-brand-500/[0.03]"
                    >
                      <TableCell>
                        <p className="break-all text-xs font-bold text-brand-600 dark:text-brand-400">
                          {getTicketCode(ticket)}
                        </p>
                        <p className="mt-1.5 text-xs text-gray-400">
                          {formatDate(ticket.waktuKeluhan || ticket.createdAt)}
                        </p>
                      </TableCell>

                      <TableCell>
                        <p
                          title={getTicketTitle(ticket)}
                          className="line-clamp-1 text-sm font-semibold text-gray-800 dark:text-white/90"
                        >
                          {getTicketTitle(ticket)}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-400">
                          Kategori: {ticket.kategoriKeluhan || "Belum ditentukan"}
                        </p>
                      </TableCell>

                      <TableCell>
                        <p
                          className={`truncate text-sm font-medium ${ticket.handlerId
                            ? "text-gray-700 dark:text-gray-300"
                            : "text-gray-400"
                            }`}
                        >
                          {getHandlerName(ticket)}
                        </p>
                        {ticket.handlerId && (
                          <p className="mt-1 text-xs text-gray-400">IT Support</p>
                        )}
                      </TableCell>

                      <TableCell>
                        <PriorityBadge priority={ticket.priority} />
                        <p className="mt-1 text-[11px] text-gray-400">
                          Priority {getPriorityNumber(ticket.priority) || "-"}
                        </p>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={ticket.status} />
                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-gray-400">
                          {getStatusDescription(ticket.status)}
                        </p>
                      </TableCell>

                      <TableCell align="center">
  <button
    type="button"
    onClick={() => setDetailTicket(ticket)}
    title="Lihat Detail"
    aria-label="Lihat Detail"
    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-theme-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
  >
    <EyeIcon />
  </button>
</TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {latestTickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all text-xs font-semibold text-brand-600 dark:text-brand-400">
                        {getTicketCode(ticket)}
                      </p>
                      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-gray-800 dark:text-white/90">
                        {getTicketTitle(ticket)}
                      </h3>
                    </div>

                    <StatusBadge status={ticket.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MobileInfo label="PIC" value={getHandlerName(ticket)} />
                    <MobileInfo
                      label="Tanggal"
                      value={formatDate(ticket.waktuKeluhan || ticket.createdAt)}
                    />
                    <div className="col-span-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Priority
                      </p>
                      <div className="mt-2">
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailTicket(ticket)}
                    title="Lihat Detail"
                    aria-label="Lihat Detail"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  >
                    <EyeIcon />
                  </button>
                </article>
              ))}
            </div>
          </>
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

/* =========================
 * COMPONENTS
 * ========================= */

function StatCard({
  title,
  value,
  description,
  icon,
  color,
}: StatCardProps) {
  const styles: Record<StatColor, { icon: string; value: string }> = {
    blue: {
      icon: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      value: "text-brand-600 dark:text-brand-400",
    },
    gray: {
      icon: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      value: "text-gray-900 dark:text-white/90",
    },
    purple: {
      icon: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
      value: "text-purple-600 dark:text-purple-400",
    },
    orange: {
      icon: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
      value: "text-warning-700 dark:text-warning-400",
    },
    green: {
      icon: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
      value: "text-success-700 dark:text-success-400",
    },
  };

  const current = styles[color];

  return (
    <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${current.icon}`}
      >
        {icon}
      </div>

      <p className="mt-4 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p className={`mt-1 text-3xl font-bold ${current.value}`}>{value}</p>
      <p className="mt-2 truncate text-xs text-gray-400">{description}</p>
    </article>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {getStatusLabel(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: PriorityValue }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
        priority
      )}`}
    >
      <PriorityIcon />
      {getPrioritySource(priority)}
    </span>
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
      className={`px-4 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${
        align === "center"
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

function TableCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <td
      className={`overflow-hidden px-4 py-4 align-middle text-sm text-gray-600 dark:text-gray-300 ${
        align === "center"
          ? "text-center"
          : align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function MobileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1.5 break-words text-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function EmptyTicket() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <DocumentIcon />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        Belum ada keluhan
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
        Anda belum pernah membuat keluhan. Buat keluhan pertama untuk
        mendapatkan bantuan dari tim IT.
      </p>

      <Link
        href="/user/tickets/create"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
      >
        <PlusIcon />
        Buat Keluhan
      </Link>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 pb-8">
      <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
          />
        ))}
      </div>

      <div className="min-h-[330px] animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
    </div>
  );
}

/* =========================
 * ICONS
 * ========================= */

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" d="M12 5.25v13.5M18.75 12H5.25" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PriorityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12V16.5ZM4.5 19.5h15L12 4.5l-7.5 15Z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H6.375A1.125 1.125 0 0 0 5.25 3.375v17.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V6.75L13.5 2.25Z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 6.75 4.5h10.5l2.25 8.25m-15 0v5.625A1.875 1.875 0 0 0 6.375 20.25h11.25a1.875 1.875 0 0 0 1.875-1.875V12.75h-4.125a3.375 3.375 0 0 1-6.75 0H4.5Z" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}

function ProcessIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 12.804-5.304L19.5 9m0 0V4.5M19.5 9H15m4.5 3a7.5 7.5 0 0 1-12.804 5.304L4.5 15m0 0v4.5M4.5 15H9" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M9.5 8.5v7M14.5 8.5v7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 2.25 2.25 4.75-5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}