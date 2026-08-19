"use client";

import dynamic from "next/dynamic";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ApexOptions } from "apexcharts";

import {
  getTickets,
  Ticket,
} from "@/services/ticket.service";

const ReactApexChart = dynamic(
  () => import("react-apexcharts"),
  { ssr: false }
);

const CURRENT_YEAR = new Date().getFullYear();
const REFRESH_INTERVAL = 10_000;

type NormalizedTicketStatus =
  | "MASUK"
  | "OPEN"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED";

type EmployeeInfo = {
  id?: number;
  nik?: string;
  nama?: string;
  jabatan?: string;
  unitKerja?: string;
  jobTitle?: string | null;
};

type HandlerInfo = {
  id?: number;
  email?: string;
  employee?: EmployeeInfo | null;
};

type DashboardTicket = Ticket & {
  status?: string;
  kategoriKeluhan?: string | null;
  waktuKeluhan?: string;
  createdAt?: string;
  handlerId?: number | null;
  handler?: HandlerInfo | null;
};

type StaffRecap = {
  id: string;
  nama: string;
  open: number;
  pending: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  masuk: number;
  total: number;
  persentase: number;
};

type StatusCardProps = {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
  iconClassName: string;
  valueClassName?: string;
};

function normalizeStatus(
  status?: string
): NormalizedTicketStatus {
  const normalized = String(status || "MASUK")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");

  if (["WAITING", "ASSIGNED"].includes(normalized)) {
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

  if (["RESOLVED", "CLOSED", "SELESAI"].includes(normalized)) {
    return "COMPLETED";
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
    return normalized as NormalizedTicketStatus;
  }

  return "MASUK";
}

function getTicketDate(ticket: DashboardTicket) {
  return ticket.waktuKeluhan || ticket.createdAt || "";
}

function getHandlerName(ticket: DashboardTicket) {
  return (
    ticket.handler?.employee?.nama ||
    ticket.handler?.email ||
    ""
  );
}

function getHandlerId(ticket: DashboardTicket) {
  return String(
    ticket.handler?.id ||
      ticket.handlerId ||
      ticket.handler?.email ||
      getHandlerName(ticket) ||
      "unassigned"
  );
}

function calculatePercentage(completed: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

function formatLastUpdated(date: Date | null) {
  if (!date) {
    return "Belum diperbarui";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function StatusCard({
  title,
  value,
  description,
  icon,
  iconClassName,
  valueClassName = "text-gray-800 dark:text-white",
}: StatusCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs transition hover:border-brand-200 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>

        <button
          type="button"
          aria-label={`Informasi ${title}`}
          className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400"
        >
          {/* <InfoIcon /> */}
        </button>
      </div>

      <p className="mt-4 truncate text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>

      <p className={`mt-1 text-2xl font-bold ${valueClassName}`}>
        {value}
      </p>

      <p className="mt-1 truncate text-[11px] text-gray-400">
        {description}
      </p>

      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400">Bulan ini</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState<DashboardTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(
    async (initialLoading = false) => {
      try {
        if (initialLoading) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setError("");

        const result = await getTickets();

        setTickets(
          Array.isArray(result)
            ? (result as DashboardTicket[])
            : []
        );

        setLastUpdated(new Date());
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal mengambil data dashboard."
        );
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadDashboard(true);

    const interval = window.setInterval(() => {
      void loadDashboard(false);
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  const statistics = useMemo(() => {
    return {
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
      cancelled: tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === "CANCELLED"
      ).length,
    };
  }, [tickets]);

  const monthlyData = useMemo(() => {
    const result = Array.from({ length: 12 }).fill(0) as number[];

    tickets.forEach((ticket) => {
      const dateValue = getTicketDate(ticket);
      if (!dateValue) return;

      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime())) return;
      if (date.getFullYear() !== CURRENT_YEAR) return;

      result[date.getMonth()] += 1;
    });

    return result;
  }, [tickets]);

  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();

    tickets.forEach((ticket) => {
      const category =
        ticket.kategoriKeluhan?.trim() ||
        "Belum dikategorikan";

      categoryMap.set(
        category,
        (categoryMap.get(category) || 0) + 1
      );
    });

    return Array.from(categoryMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [tickets]);

  const staffData = useMemo<StaffRecap[]>(() => {
    const staffMap = new Map<string, StaffRecap>();

    tickets.forEach((ticket) => {
      const handlerName = getHandlerName(ticket);
      const staffName = handlerName || "Belum ditangani";
      const staffId = handlerName
        ? getHandlerId(ticket)
        : "unassigned";

      const currentStaff = staffMap.get(staffId) || {
        id: staffId,
        nama: staffName,
        open: 0,
        pending: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0,
        masuk: 0,
        total: 0,
        persentase: 0,
      };

      const status = normalizeStatus(ticket.status);
      currentStaff.total += 1;

      if (status === "MASUK") currentStaff.masuk += 1;
      else if (status === "OPEN") currentStaff.open += 1;
      else if (status === "ON_GOING") currentStaff.ongoing += 1;
      else if (status === "PENDING") currentStaff.pending += 1;
      else if (status === "COMPLETED") currentStaff.completed += 1;
      else if (status === "CANCELLED") currentStaff.cancelled += 1;

      currentStaff.persentase = calculatePercentage(
        currentStaff.completed,
        currentStaff.total
      );

      staffMap.set(staffId, currentStaff);
    });

    return Array.from(staffMap.values()).sort((a, b) => {
      if (a.id === "unassigned") return 1;
      if (b.id === "unassigned") return -1;
      return a.nama.localeCompare(b.nama, "id-ID");
    });
  }, [tickets]);

  const monthlyOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        fontFamily: "Outfit, sans-serif",
      },
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: { opacityFrom: 0.3, opacityTo: 0.04 },
      },
      dataLabels: { enabled: false },
      markers: { size: 4, hover: { size: 6 } },
      xaxis: {
        categories: [
          "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
          "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
        ],
        labels: { style: { fontSize: "12px" } },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (value) => Math.round(value).toString(),
        },
      },
      grid: { borderColor: "#E4E7EC", strokeDashArray: 4 },
      colors: ["#465FFF"],
      tooltip: {
        y: { formatter: (value) => `${value} laporan` },
      },
    }),
    []
  );

  const monthlySeries = useMemo(
    () => [{ name: "Laporan Masuk", data: monthlyData }],
    [monthlyData]
  );

  const categoryOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "Outfit, sans-serif",
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          horizontal: true,
          barHeight: "48%",
        },
      },
      dataLabels: { enabled: true },
      xaxis: {
        categories: categoryData.map((item) => item.name),
        labels: { style: { fontSize: "12px" } },
      },
      yaxis: {
        labels: {
          maxWidth: 150,
          style: { fontSize: "12px" },
        },
      },
      grid: { borderColor: "#E4E7EC", strokeDashArray: 4 },
      colors: ["#465FFF"],
      tooltip: {
        y: { formatter: (value) => `${value} laporan` },
      },
      noData: { text: "Belum ada data kategori" },
    }),
    [categoryData]
  );

  const categorySeries = useMemo(
    () => [
      {
        name: "Jumlah Laporan",
        data: categoryData.map((item) => item.total),
      },
    ],
    [categoryData]
  );

  const statusDonutOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        fontFamily: "Outfit, sans-serif",
      },
      labels: ["Masuk", "Open", "On Going", "Pending", "Completed"],
      colors: ["#98A2B3", "#465FFF", "#7A5AF8", "#F79009", "#12B76A"],
      stroke: { width: 0 },
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: {
                show: true,
                offsetY: 20,
                formatter: () => "Total Ticket",
              },
              value: {
                show: true,
                offsetY: -12,
                fontSize: "28px",
                fontWeight: 700,
                formatter: () => String(statistics.total),
              },
              total: { show: false },
            },
          },
        },
      },
      tooltip: {
        y: { formatter: (value) => `${value} ticket` },
      },
    }),
    [statistics.total]
  );

  const statusDonutSeries = useMemo(
    () => [
      statistics.masuk,
      statistics.open,
      statistics.ongoing,
      statistics.pending,
      statistics.completed,
    ],
    [statistics]
  );

  const completionPercentage = useMemo(
    () =>
      calculatePercentage(
        statistics.completed,
        statistics.total
      ),
    [statistics.completed, statistics.total]
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-6 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03] sm:px-8">
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
              Dashboard Administrator
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
              Dashboard Help Desk IT
            </h1>

            <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
              Ringkasan laporan, kategori keluhan, dan performa penanganan ticket tahun {CURRENT_YEAR}.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 rounded-xl border border-success-100 bg-success-50 px-4 py-3 dark:border-success-500/20 dark:bg-success-500/10 lg:items-end">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full bg-success-500 ${
                  isRefreshing ? "animate-pulse" : ""
                }`}
              />
              <p className="text-theme-sm font-semibold text-success-700 dark:text-success-400">
                Sinkron otomatis
              </p>
            </div>

            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              Diperbarui {formatLastUpdated(lastUpdated)}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-5 py-4 dark:border-error-500/30 dark:bg-error-500/10">
          <p className="font-semibold text-error-700 dark:text-error-400">
            Dashboard gagal diperbarui
          </p>
          <p className="mt-1 text-theme-sm text-error-600 dark:text-error-400">
            {error}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <StatusCard title="Total Ticket" value={statistics.total} description="Seluruh ticket" valueClassName="text-brand-600 dark:text-brand-400" icon={<DocumentIcon />} iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" />
        <StatusCard title="Masuk" value={statistics.masuk} description="Belum ditugaskan" icon={<InboxIcon />} iconClassName="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" />
        <StatusCard title="Open" value={statistics.open} description="Sudah ditugaskan" valueClassName="text-brand-600 dark:text-brand-400" icon={<OpenIcon />} iconClassName="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" />
        <StatusCard title="On Going" value={statistics.ongoing} description="Sedang dikerjakan" valueClassName="text-purple-600 dark:text-purple-400" icon={<ProcessIcon />} iconClassName="bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400" />
        <StatusCard title="Pending" value={statistics.pending} description="Ditunda sementara" valueClassName="text-warning-700 dark:text-warning-400" icon={<PauseIcon />} iconClassName="bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400" />
        <StatusCard title="Completed" value={statistics.completed} description="Pengerjaan selesai" valueClassName="text-success-700 dark:text-success-400" icon={<CheckIcon />} iconClassName="bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <ChartCard title="Ringkasan Status Ticket" description="Distribusi ticket berdasarkan status." className="col-span-12 xl:col-span-5">
          <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-[230px_1fr]">
            <ReactApexChart options={statusDonutOptions} series={statusDonutSeries} type="donut" height={230} />

            <div className="space-y-3">
              <StatusLegend label="Masuk" value={statistics.masuk} total={statistics.total} dotClass="bg-gray-400" />
              <StatusLegend label="Open" value={statistics.open} total={statistics.total} dotClass="bg-brand-500" />
              <StatusLegend label="On Going" value={statistics.ongoing} total={statistics.total} dotClass="bg-purple-500" />
              <StatusLegend label="Pending" value={statistics.pending} total={statistics.total} dotClass="bg-warning-500" />
              <StatusLegend label="Completed" value={statistics.completed} total={statistics.total} dotClass="bg-success-500" />
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Performa Penyelesaian" description="Persentase ticket yang berhasil diselesaikan." className="col-span-12 xl:col-span-7">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[190px_1fr]">
            <div className="rounded-2xl border border-success-100 bg-success-50 p-5 dark:border-success-500/20 dark:bg-success-500/10">
              <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Rata-rata Penyelesaian</p>
              <p className="mt-4 text-4xl font-bold text-success-600 dark:text-success-400">{completionPercentage}%</p>
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">dari total ticket selesai</p>
              <div className="mt-6 border-t border-success-100 pt-4 dark:border-success-500/20">
                <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Target: ≥ 80%</p>
              </div>
            </div>

            <div className="flex min-h-[230px] flex-col justify-center">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300">Progress Penyelesaian</p>
                <p className="text-theme-sm font-bold text-success-600 dark:text-success-400">{completionPercentage}%</p>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-success-500 transition-all duration-500" style={{ width: `${Math.min(completionPercentage, 100)}%` }} />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <PerformanceItem label="Ticket Selesai" value={statistics.completed} />
                <PerformanceItem label="Total Ticket" value={statistics.total} />
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <ChartCard title={`Frekuensi Laporan Help Desk ${CURRENT_YEAR}`} description="Jumlah laporan yang masuk setiap bulan." className="col-span-12 xl:col-span-5">
          <ReactApexChart options={monthlyOptions} series={monthlySeries} type="area" height={275} />
        </ChartCard>

        <ChartCard title="Kategori Laporan" description="Distribusi laporan berdasarkan kategori keluhan." className="col-span-12 xl:col-span-7">
          {categoryData.length === 0 ? (
            <EmptyChart message="Belum ada data kategori laporan." />
          ) : (
            <ReactApexChart options={categoryOptions} series={categorySeries} type="bar" height={275} />
          )}
        </ChartCard>
      </div>
      <section className="col-span-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] md:col-span-7 xl:col-span-4">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-base font-bold text-gray-800 dark:text-white/90">Rekapitulasi Penanganan</h2>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">Penyelesaian berdasarkan petugas.</p>
          </div>

          {staffData.length === 0 ? (
            <EmptyChart message="Belum ada data petugas." />
          ) : (
            <div className="max-h-[290px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <TableHeader align="left">Petugas</TableHeader>
                    <TableHeader>Open</TableHeader>
                    <TableHeader>On Going</TableHeader>
                    <TableHeader>Selesai</TableHeader>
                    <TableHeader>%</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {staffData.map((staff) => (
                    <tr key={staff.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                            {staff.nama.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-theme-xs font-semibold text-gray-800 dark:text-white/90">{staff.nama}</p>
                            {staff.id === "unassigned" && (
                              <p className="mt-0.5 text-[10px] text-warning-600">Belum memiliki handler</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <CompactTableValue value={staff.open} />
                      <CompactTableValue value={staff.ongoing} />
                      <CompactTableValue value={staff.completed} />

                      <td className="px-3 py-3 text-center">
                        <PercentageBadge value={staff.persentase} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      <div className="flex flex-col gap-1 border-t border-gray-100 pt-4 text-[11px] text-gray-400 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <span>Menampilkan data real-time.</span>
        <span>Semua waktu menggunakan WIB.</span>
      </div>
    </div>
  );
}

function ChartCard({ title, description, className = "", children }: { title: string; description: string; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] ${className}`}>
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-800 dark:text-white/90">{title}</h2>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

function StatusLegend({ label, value, total, dotClass }: { label: string; value: number; total: number; dotClass: string }) {
  const percentage = calculatePercentage(value, total);
  return (
    <div className="grid grid-cols-[1fr_35px_55px] items-center gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <span className="text-theme-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
      </div>
      <span className="text-right text-theme-xs font-semibold text-gray-800 dark:text-white/90">{value}</span>
      <span className="text-right text-theme-xs text-gray-400">{percentage}%</span>
    </div>
  );
}

function PerformanceItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

function TableHeader({ children, align = "center" }: { children: ReactNode; align?: "left" | "center" }) {
  return (
    <th className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${align === "left" ? "text-left" : "text-center"}`}>
      {children}
    </th>
  );
}

function CompactTableValue({ value }: { value: number }) {
  return (
    <td className="px-3 py-3 text-center text-theme-xs font-medium text-gray-600 dark:text-gray-300">{value}</td>
  );
}

function PercentageBadge({ value }: { value: number }) {
  let className = "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  if (value >= 80) className = "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  else if (value >= 50) className = "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${className}`}>{value}%</span>;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <ChartIcon />
      </div>
      <p className="mt-4 text-theme-sm font-medium text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 pb-8">
      <div className="h-44 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]" />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 h-[330px] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 xl:col-span-5" />
        <div className="col-span-12 h-[330px] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 xl:col-span-7" />
      </div>
    </div>
  );
}

// function InfoIcon() {
//   return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 10.5v5" /><circle cx="12" cy="7.5" r=".7" fill="currentColor" stroke="none" /></svg>;
// }
function DocumentIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H6.375A1.125 1.125 0 0 0 5.25 3.375v17.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V6.75L13.5 2.25Z" /></svg>;
}
function InboxIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 6.75 4.5h10.5l2.25 8.25m-15 0v5.625A1.875 1.875 0 0 0 6.375 20.25h11.25a1.875 1.875 0 0 0 1.875-1.875V12.75h-4.125a3.375 3.375 0 0 1-6.75 0H4.5Z" /></svg>;
}
function OpenIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" /></svg>;
}
function ProcessIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 12.804-5.304L19.5 9m0 0V4.5M19.5 9H15m4.5 3a7.5 7.5 0 0 1-12.804 5.304L4.5 15m0 0v4.5M4.5 15H9" /></svg>;
}
function PauseIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M9.5 8.5v7M14.5 8.5v7" /></svg>;
}
function CheckIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 2.25 2.25 4.75-5" /></svg>;
}
function ChartIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5h16.5M6 16.5v-6m6 6v-12m6 12V8.25" /></svg>;
}