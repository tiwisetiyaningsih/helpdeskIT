"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getTickets,
  Ticket,
} from "@/services/ticket.service";
import TicketDetailModal from "./TicketDetailModal";

type EmployeeData = {
  nik?: string;
  nama?: string;
  jabatan?: string;
  unitKerja?: string;
};

type UserData = {
  id?: number;
  email?: string;
  employee?: EmployeeData | null;
};

type TicketView = Ticket & {
  reporter?: UserData | null;
  handler?: UserData | null;
  employee?: EmployeeData | null;
  sla?: number | string | null;
  batasResponse?: string | null;
  selesaiResponse?: string | null;
  waktuKeluhan?: string;
  createdAt?: string;
  kategoriKeluhan?: string | null;
};

type SlaFilter =
  | "ALL"
  | "OVERDUE"
  | "DUE_SOON"
  | "SAFE"
  | "ON_TIME"
  | "LATE"
  | "UNSET";

type StatusFilter =
  | "ALL"
  | "MASUK"
  | "OPEN"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED";

type PriorityFilter = "ALL" | "1" | "2" | "3" | "4";

type SlaState =
  | "OVERDUE"
  | "DUE_SOON"
  | "SAFE"
  | "ON_TIME"
  | "LATE"
  | "UNSET";

const ITEMS_PER_PAGE = 10;
const REFRESH_INTERVAL = 15_000;
const DUE_SOON_HOURS = 2;
const SLA_TARGET = 80;

function normalizeStatus(status?: string) {
  const value = String(status || "MASUK")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");

  if (["IN_PROGRESS", "PROCESS", "PROGRESS", "ONGOING"].includes(value)) {
    return "ON_GOING";
  }

  if (["RESOLVED", "CLOSED", "SELESAI"].includes(value)) {
    return "COMPLETED";
  }

  if (["WAITING", "ASSIGNED"].includes(value)) {
    return "OPEN";
  }

  return value;
}

function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    MASUK: "Masuk",
    OPEN: "Open",
    ON_GOING: "On Going",
    PENDING: "Pending",
    COMPLETED: "Completed",
  };

  return labels[normalizeStatus(status)] || status || "-";
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
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
}

// Priority dihitung dari jabatan pelapor (konsisten dengan halaman Semua Ticket),
// dengan fallback ke ticket.priority kalau jabatan tidak dikenali.
function getPriorityFromPosition(position?: string) {
  const normalized = String(position || "").trim().toUpperCase();

  if (normalized.includes("DIREKSI") || normalized.includes("DIREKTUR")) return 1;
  if (normalized.includes("VP") || normalized.includes("EVP") || normalized.includes("VICE PRESIDENT")) return 2;
  if (normalized.includes("MANAGER") || normalized.includes("MANAJER")) return 3;
  if (normalized.includes("STAFF")) return 4;

  return null;
}

function resolveTicketPriority(ticket: TicketView) {
  const employeePriority = getPriorityFromPosition(
    getReporterEmployee(ticket)?.jabatan
  );

  return employeePriority ?? ticket.priority;
}

function getPriorityLabel(priority?: number) {
  const labels: Record<number, string> = {
    1: "Direksi",
    2: "VP/EVP",
    3: "Manager",
    4: "Staff",
  };

  return labels[priority || 0] || "Belum ditentukan";
}

function getPriorityClass(priority?: number) {
  switch (priority) {
    case 1:
      return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
    case 2:
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
    case 3:
      return "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
    case 4:
      return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatDuration(milliseconds: number) {
  const absolute = Math.abs(milliseconds);
  const totalMinutes = Math.floor(absolute / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (days === 0 && minutes > 0) parts.push(`${minutes} menit`);

  return parts.length > 0 ? parts.join(" ") : "< 1 menit";
}

function getSlaInfo(ticket: TicketView, now: number) {
  const deadline = ticket.batasResponse
    ? new Date(ticket.batasResponse).getTime()
    : Number.NaN;

  if (!ticket.batasResponse || Number.isNaN(deadline)) {
    return {
      state: "UNSET" as SlaState,
      label: "Belum diatur",
      detail: "Admin belum menentukan SLA",
      className:
        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      sortValue: Number.POSITIVE_INFINITY,
    };
  }

  const completed = normalizeStatus(ticket.status) === "COMPLETED";

  if (completed) {
    const responseTime = ticket.selesaiResponse
      ? new Date(ticket.selesaiResponse).getTime()
      : Number.NaN;

    if (!Number.isNaN(responseTime) && responseTime <= deadline) {
      return {
        state: "ON_TIME" as SlaState,
        label: "Tepat waktu",
        detail: `Lebih cepat ${formatDuration(deadline - responseTime)}`,
        className:
          "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
        sortValue: deadline,
      };
    }

    if (!Number.isNaN(responseTime)) {
      return {
        state: "LATE" as SlaState,
        label: "Selesai terlambat",
        detail: `Terlambat ${formatDuration(responseTime - deadline)}`,
        className:
          "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
        sortValue: deadline,
      };
    }

    return {
      state: "LATE" as SlaState,
      label: "Data response kosong",
      detail: "Selesai Response belum tercatat",
      className:
        "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
      sortValue: deadline,
    };
  }

  const difference = deadline - now;

  if (difference < 0) {
    return {
      state: "OVERDUE" as SlaState,
      label: "Melewati SLA",
      detail: `Terlambat ${formatDuration(difference)}`,
      className:
        "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
      sortValue: difference,
    };
  }

  if (difference <= DUE_SOON_HOURS * 60 * 60 * 1000) {
    return {
      state: "DUE_SOON" as SlaState,
      label: "Mendekati batas",
      detail: `Sisa ${formatDuration(difference)}`,
      className:
        "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
      sortValue: difference,
    };
  }

  return {
    state: "SAFE" as SlaState,
    label: "Aman",
    detail: `Sisa ${formatDuration(difference)}`,
    className:
      "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
    sortValue: difference,
  };
}

function getReporterEmployee(ticket: TicketView) {
  return ticket.reporter?.employee || ticket.employee || null;
}

function getReporterName(ticket: TicketView) {
  return (
    getReporterEmployee(ticket)?.nama ||
    ticket.reporter?.email ||
    "Pelapor tidak tersedia"
  );
}

function getHandlerName(ticket: TicketView) {
  return (
    ticket.handler?.employee?.nama ||
    ticket.handler?.email ||
    "Belum ditugaskan"
  );
}

export default function SlaMonitoring() {
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [search, setSearch] = useState("");
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] =
    useState<TicketView | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  const loadTickets = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);

      setError("");

      const data = await getTickets();

      setTickets(data);
      setLastUpdated(new Date());
      setNow(Date.now());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Terjadi kesalahan saat memuat monitoring SLA."
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets(true);

    const refreshId = window.setInterval(() => {
      void loadTickets(false);
    }, REFRESH_INTERVAL);

    const clockId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(refreshId);
      window.clearInterval(clockId);
    };
  }, [loadTickets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, slaFilter, statusFilter, priorityFilter]);

  const monitoredTickets = useMemo(() => {
    return tickets.map((ticket) => ({
      ticket,
      sla: getSlaInfo(ticket, now),
      priority: resolveTicketPriority(ticket),
    }));
  }, [tickets, now]);

  const statistics = useMemo(() => {
    return {
      monitored: monitoredTickets.filter(
        (item) => item.sla.state !== "UNSET"
      ).length,
      overdue: monitoredTickets.filter(
        (item) => item.sla.state === "OVERDUE"
      ).length,
      dueSoon: monitoredTickets.filter(
        (item) => item.sla.state === "DUE_SOON"
      ).length,
      safe: monitoredTickets.filter(
        (item) => item.sla.state === "SAFE"
      ).length,
      onTime: monitoredTickets.filter(
        (item) => item.sla.state === "ON_TIME"
      ).length,
      late: monitoredTickets.filter(
        (item) => item.sla.state === "LATE"
      ).length,
      unset: monitoredTickets.filter(
        (item) => item.sla.state === "UNSET"
      ).length,
    };
  }, [monitoredTickets]);

  const dashboardStatistics = useMemo(() => {
    const total = monitoredTickets.length;

    const onTime = monitoredTickets.filter(
      ({ sla }) => sla.state === "ON_TIME"
    ).length;

    const late = monitoredTickets.filter(({ sla }) =>
      ["OVERDUE", "LATE"].includes(sla.state)
    ).length;

    const onGoing = monitoredTickets.filter(({ ticket }) =>
      ["OPEN", "ON_GOING", "PENDING"].includes(
        normalizeStatus(ticket.status)
      )
    ).length;

    const unset = monitoredTickets.filter(
      ({ sla }) => sla.state === "UNSET"
    ).length;

    const measured = onTime + late;
    const fulfillment =
      measured > 0 ? Math.round((onTime / measured) * 100) : 0;

    const configuredSla = monitoredTickets
      .map(({ ticket }) => Number(ticket.sla))
      .filter((value) => Number.isFinite(value) && value > 0);

    const averageSla =
      configuredSla.length > 0
        ? Math.round(
            configuredSla.reduce((sum, value) => sum + value, 0) /
              configuredSla.length
          )
        : 0;

    return {
      total,
      onTime,
      late,
      onGoing,
      unset,
      fulfillment,
      averageSla,
    };
  }, [monitoredTickets]);

  const filteredTickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return monitoredTickets
      .filter(({ ticket, sla, priority }) => {
        const employee = getReporterEmployee(ticket);

        const searchable = [
          ticket.noPelaporan,
          ticket.keluhan,
          ticket.kategoriKeluhan || "",
          employee?.nik || "",
          employee?.nama || "",
          employee?.unitKerja || "",
          getHandlerName(ticket),
          getStatusLabel(ticket.status),
          getPriorityLabel(priority),
          sla.label,
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch = !keyword || searchable.includes(keyword);
        const matchesSla =
          slaFilter === "ALL" || sla.state === slaFilter;
        const matchesStatus =
          statusFilter === "ALL" ||
          normalizeStatus(ticket.status) === statusFilter;
        const matchesPriority =
          priorityFilter === "ALL" ||
          Number(priority) === Number(priorityFilter);

        return (
          matchesSearch &&
          matchesSla &&
          matchesStatus &&
          matchesPriority
        );
      })
      .sort((a, b) => {
        const weight: Record<SlaState, number> = {
          OVERDUE: 1,
          DUE_SOON: 2,
          SAFE: 3,
          LATE: 4,
          ON_TIME: 5,
          UNSET: 6,
        };

        const stateDifference =
          weight[a.sla.state] - weight[b.sla.state];

        if (stateDifference !== 0) return stateDifference;

        return a.sla.sortValue - b.sla.sortValue;
      });
  }, [
    monitoredTickets,
    search,
    slaFilter,
    statusFilter,
    priorityFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / ITEMS_PER_PAGE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const pageItems = filteredTickets.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const firstItem =
    filteredTickets.length === 0
      ? 0
      : (safePage - 1) * ITEMS_PER_PAGE + 1;

  const lastItem = Math.min(
    safePage * ITEMS_PER_PAGE,
    filteredTickets.length
  );

  return (
    <>
      <div className="space-y-4 pb-6">
        <PageHeader />

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            <span className="font-medium">{error}</span>

            <button
              type="button"
              onClick={() => void loadTickets(true)}
              className="font-semibold underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatisticCard
            label="Total Ticket"
            value={dashboardStatistics.total}
            description="Semua ticket terdaftar"
            color="blue"
            icon={<TicketIcon />}
          />

          <StatisticCard
            label="Selesai Tepat Waktu"
            value={dashboardStatistics.onTime}
            description={`${dashboardStatistics.fulfillment}% dari ticket terukur`}
            color="green"
            icon={<CheckCircleIcon />}
          />

          <StatisticCard
            label="SLA Terlambat"
            value={dashboardStatistics.late}
            description="Melewati batas response"
            color="orange"
            icon={<ClockIcon />}
          />

          <StatisticCard
            label="Rata-rata SLA"
            value={`${dashboardStatistics.averageSla}j`}
            description="Rata-rata target response"
            color="purple"
            icon={<HourglassIcon />}
          />

          <StatisticCard
            label="SLA Terpenuhi"
            value={`${dashboardStatistics.fulfillment}%`}
            description={`Target minimal ${SLA_TARGET}%`}
            color="green"
            icon={<TrophyIcon />}
          />
        </section>

        {/* Hanya 1 diagram: distribusi SLA berbentuk lingkaran (donut) */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h2 className="font-bold text-gray-800 dark:text-white/90">
            Distribusi SLA
          </h2>

          <p className="mt-1 text-theme-xs text-gray-400">
            Proporsi kondisi SLA dari seluruh ticket yang terdaftar.
          </p>

          <div className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-center sm:gap-12">
            <SlaDonutChart
              total={dashboardStatistics.total}
              onTime={dashboardStatistics.onTime}
              onGoing={dashboardStatistics.onGoing}
              unset={dashboardStatistics.unset}
              late={dashboardStatistics.late}
            />

            <div className="w-full max-w-[260px] space-y-3.5 border-gray-100 sm:border-l sm:pl-8 dark:border-gray-800">
              <DistributionItem
                colorClass="bg-success-500"
                label="Tepat Waktu"
                value={dashboardStatistics.onTime}
                total={dashboardStatistics.total}
              />

              <DistributionItem
                colorClass="bg-brand-500"
                label="On Going"
                value={dashboardStatistics.onGoing}
                total={dashboardStatistics.total}
              />

              <DistributionItem
                colorClass="bg-warning-500"
                label="Terlambat"
                value={dashboardStatistics.late}
                total={dashboardStatistics.total}
              />

              <DistributionItem
                colorClass="bg-gray-300"
                label="Belum Diatur"
                value={dashboardStatistics.unset}
                total={dashboardStatistics.total}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-bold text-gray-800 dark:text-white/90">
                  Daftar Monitoring SLA
                </h2>

                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  Menampilkan {filteredTickets.length} dari{" "}
                  {tickets.length} ticket.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <div className="relative w-full sm:w-[280px]">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <SearchIcon />
                  </span>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari ticket, pelapor, unit, PIC..."
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-theme-xs text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div className="relative sm:w-[170px]">
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                    className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-theme-xs text-gray-700 outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="MASUK">Masuk</option>
                    <option value="OPEN">Open</option>
                    <option value="ON_GOING">On Going</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                  </select>

                  <ChevronDownIcon />
                </div>

                <div className="relative sm:w-[170px]">
                  <select
                    value={priorityFilter}
                    onChange={(event) =>
                      setPriorityFilter(
                        event.target.value as PriorityFilter
                      )
                    }
                    className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-theme-xs text-gray-700 outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="ALL">Semua Priority</option>
                    <option value="1">Direksi</option>
                    <option value="2">VP/EVP</option>
                    <option value="3">Manager</option>
                    <option value="4">Staff</option>
                  </select>

                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <FilterChip
                active={slaFilter === "ALL"}
                onClick={() => setSlaFilter("ALL")}
              >
                Semua
              </FilterChip>

              <FilterChip
                active={slaFilter === "OVERDUE"}
                onClick={() => setSlaFilter("OVERDUE")}
                count={statistics.overdue}
              >
                Terlambat
              </FilterChip>

              <FilterChip
                active={slaFilter === "DUE_SOON"}
                onClick={() => setSlaFilter("DUE_SOON")}
                count={statistics.dueSoon}
              >
                Mendekati Batas
              </FilterChip>

              <FilterChip
                active={slaFilter === "SAFE"}
                onClick={() => setSlaFilter("SAFE")}
                count={statistics.safe}
              >
                Aman
              </FilterChip>

              <FilterChip
                active={slaFilter === "UNSET"}
                onClick={() => setSlaFilter("UNSET")}
                count={statistics.unset}
              >
                Belum Diatur
              </FilterChip>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : pageItems.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1080px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/60">
                      <TableHeader>Ticket ID</TableHeader>
                      <TableHeader>Pelapor</TableHeader>
                      <TableHeader>PIC</TableHeader>
                      <TableHeader align="center">Priority</TableHeader>
                      <TableHeader align="center">SLA</TableHeader>
                      <TableHeader>Batas Response</TableHeader>
                      <TableHeader>Kondisi SLA</TableHeader>
                      <TableHeader align="center">Status</TableHeader>
                      <TableHeader align="center">Aksi</TableHeader>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {pageItems.map(({ ticket, sla, priority }, index) => {
                      const reporterEmployee = getReporterEmployee(ticket);

                      return (
                        <tr
                          key={ticket.id}
                          className={`transition hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                            index % 2 === 1
                              ? "bg-gray-50/40 dark:bg-white/[0.01]"
                              : ""
                          }`}
                        >
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setSelectedTicket(ticket)}
                              className="text-left text-theme-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {ticket.noPelaporan}
                            </button>

                            <p className="mt-1 max-w-[180px] truncate text-theme-xs text-gray-400">
                              {ticket.keluhan}
                            </p>
                          </TableCell>

                          <TableCell>
                            <p className="max-w-[150px] truncate text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                              {getReporterName(ticket)}
                            </p>

                            <p className="mt-1 max-w-[150px] truncate text-theme-xs text-gray-400">
                              {reporterEmployee?.unitKerja || "-"}
                            </p>
                          </TableCell>

                          <TableCell>
                            <p className="max-w-[130px] truncate text-theme-xs text-gray-600 dark:text-gray-300">
                              {getHandlerName(ticket)}
                            </p>
                          </TableCell>

                          <TableCell>
                            <PriorityBadge priority={priority} />
                          </TableCell>

                          <TableCell>
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-theme-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {ticket.sla ? `${ticket.sla} jam` : "Belum diatur"}
                            </span>
                          </TableCell>

                          <TableCell>
                            <p className="max-w-[130px] text-theme-xs leading-5 text-gray-500 dark:text-gray-400">
                              {formatDateTime(ticket.batasResponse)}
                            </p>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${sla.className}`}
                            >
                              {sla.label}
                            </span>

                            <p className="mt-1 text-theme-xs text-gray-400">
                              {sla.detail}
                            </p>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getStatusClass(
                                ticket.status
                              )}`}
                            >
                              {getStatusLabel(ticket.status)}
                            </span>
                          </TableCell>

                          <TableCell align="center">
                            <button
                              type="button"
                              title="Lihat detail"
                              onClick={() => setSelectedTicket(ticket)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10"
                            >
                              <EyeIcon />
                            </button>
                          </TableCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 lg:hidden">
                {pageItems.map(({ ticket, sla, priority }) => (
                  <article
                    key={ticket.id}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-all text-theme-xs font-semibold text-brand-600 dark:text-brand-400">
                          {ticket.noPelaporan}
                        </p>

                        <p className="mt-1 line-clamp-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                          {ticket.keluhan}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${sla.className}`}
                      >
                        {sla.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MobileInfo label="Pelapor" value={getReporterName(ticket)} />
                      <MobileInfo label="PIC" value={getHandlerName(ticket)} />
                      <MobileInfo label="Priority" value={getPriorityLabel(priority)} />
                      <MobileInfo
                        label="SLA"
                        value={ticket.sla ? `${ticket.sla} jam` : "Belum diatur"}
                      />
                      <MobileInfo label="Sisa Waktu" value={sla.detail} />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTicket(ticket)}
                      className="mt-4 h-10 w-full rounded-lg bg-brand-500 text-theme-sm font-semibold text-white transition hover:bg-brand-600"
                    >
                      Lihat Detail
                    </button>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  Menampilkan {firstItem}–{lastItem} dari{" "}
                  {filteredTickets.length} ticket
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className={paginationButtonClass}
                  >
                    Sebelumnya
                  </button>

                  <span className="inline-flex h-9 min-w-[70px] items-center justify-center rounded-lg bg-brand-50 px-3 text-theme-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    {safePage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                    className={paginationButtonClass}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </>
  );
}

const paginationButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-theme-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

function PageHeader() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:px-7">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[300px] lg:block">
        <div className="absolute right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-brand-50 dark:bg-brand-500/10" />
        <div
          className="absolute bottom-5 left-0 h-14 w-32 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(70,95,255,0.3) 1.4px, transparent 1.4px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="absolute right-14 top-1/2 -translate-y-1/2 text-brand-500">
          <SlaGaugeIllustration />
        </div>
      </div>

      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          Monitoring
        </div>

        <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
          Monitoring SLA
        </h1>

        <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
          Pantau performa SLA ticket secara real-time dan pastikan
          layanan berjalan sesuai target.
        </p>
      </div>
    </section>
  );
}

function SlaGaugeIllustration() {
  return (
    <svg viewBox="0 0 140 120" className="h-20 w-24" fill="none">
      <circle
        cx="70"
        cy="65"
        r="42"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M32 78a38 38 0 1 1 76 0"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M32 78a38 38 0 0 1 24-35"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx="70" cy="78" r="5" fill="currentColor" />
      <path
        d="M70 78 L92 54"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="24" y="14" width="18" height="18" rx="5" fill="currentColor" opacity="0.25" />
      <rect x="100" y="20" width="14" height="14" rx="4" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

type StatisticColor = "blue" | "gray" | "purple" | "orange" | "green";

function StatisticCard({
  label,
  value,
  description,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  description: string;
  color: StatisticColor;
  icon: React.ReactNode;
}) {
  const styles: Record<StatisticColor, { icon: string; value: string }> = {
    blue: {
      icon: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      value: "text-brand-600 dark:text-brand-400",
    },
    gray: {
      icon: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      value: "text-gray-800 dark:text-white/90",
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

  const currentStyle = styles[color];

  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${currentStyle.icon}`}
      >
        {icon}
      </div>

      <p className="mt-3 truncate text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`text-xl font-bold ${currentStyle.value}`}>{value}</p>
        <span className="text-right text-theme-xs text-gray-400">
          {description}
        </span>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority?: number }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getPriorityClass(
          priority
        )}`}
      >
        <PriorityIcon />
        {getPriorityLabel(priority)}
      </span>
    </div>
  );
}

function SlaDonutChart({
  total,
  onTime,
  onGoing,
  unset,
  late,
}: {
  total: number;
  onTime: number;
  onGoing: number;
  unset: number;
  late: number;
}) {
  const size = 180;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(total, 1);

  const segments = [
    { value: onTime, stroke: "#12B76A" },
    { value: onGoing, stroke: "#4E7BFF" },
    { value: late, stroke: "#F79009" },
    { value: unset, stroke: "#D0D5DD" },
  ];

  let accumulated = 0;

  return (
    <div className="relative h-[180px] w-[180px] shrink-0">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F2F4F7"
          strokeWidth={strokeWidth}
        />

        {segments.map((segment, index) => {
          const length = (segment.value / safeTotal) * circumference;
          const offset = -(accumulated / safeTotal) * circumference;

          accumulated += segment.value;

          return (
            <circle
              key={`${segment.stroke}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-800 dark:text-white/90">
          {total}
        </span>

        <span className="mt-1 text-theme-xs text-gray-400">Total Ticket</span>
      </div>
    </div>
  );
}

function DistributionItem({
  colorClass,
  label,
  value,
  total,
}: {
  colorClass: string;
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`} />

        <span className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>

      <span className="shrink-0 text-theme-xs font-bold text-gray-700 dark:text-gray-300">
        {value} ({percentage}%)
      </span>
    </div>
  );
}

function FilterChip({
  children,
  active,
  count,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-theme-xs font-semibold transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
          : "border-gray-200 bg-white text-gray-500 hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
      }`}
    >
      {children}

      {typeof count === "number" && (
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
            active
              ? "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <th
      className={`px-4 py-4 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${
        align === "center" ? "text-center" : "text-left"
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
  align?: "left" | "center";
}) {
  return (
    <td
      className={`px-4 py-4 align-middle text-theme-sm text-gray-600 dark:text-gray-300 ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function MobileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
      <p className="text-theme-xs uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat monitoring SLA...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <ClockIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        Data SLA tidak ditemukan
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        Tidak ada ticket yang sesuai dengan pencarian atau filter yang
        dipilih.
      </p>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M4 6.5h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4v-4Z" />
      <path d="M9 9v6" strokeDasharray="2 2" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="m8 12 2.5 2.5L16 9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 7.5V12l3 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M7 3h10M7 21h10M8 3c0 4 1 6 4 9-3 3-4 5-4 9M16 3c0 4-1 6-4 9 3 3 4 5 4 9" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M8 4h8v4c0 3-1.7 5-4 5s-4-2-4-5V4Z" />
      <path d="M8 6H5v1c0 3 1.5 4.5 4 4.5M16 6h3v1c0 3-1.5 4.5-4 4.5M12 13v4M8 21h8M9 17h6v4" />
    </svg>
  );
}

function PriorityIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
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

function EyeIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}