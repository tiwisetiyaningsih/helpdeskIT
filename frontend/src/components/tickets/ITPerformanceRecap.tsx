"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getTickets,
  type Ticket,
} from "@/services/ticket.service";

type MonthFilter =
  | "ALL"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11";

type NormalizedStatus =
  | "MASUK"
  | "OPEN"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED";

type EmployeeData = {
  id?: number;
  nik?: string;
  nama?: string;
  jabatan?: string;
  unitKerja?: string;
  jobTitle?: string | null;
};

type UserData = {
  id?: number;
  email?: string;
  employee?: EmployeeData | null;
};

type PerformanceTicket = Ticket & {
  reporter?: UserData | null;
  handler?: UserData | null;
};

type ITPerformance = {
  handlerId: number;
  name: string;
  email: string;
  nik: string;
  jobTitle: string;
  unitKerja: string;

  assigned: number;
  open: number;
  onGoing: number;
  pending: number;
  completed: number;
  cancelled: number;

  active: number;
  completionRate: number;

  onTime: number;
  late: number;
  slaMeasured: number;
  slaComplianceRate: number;

  averageResolutionHours: number | null;
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function normalizeStatus(
  status?: string
): NormalizedStatus {
  const normalized = String(
    status || "MASUK"
  )
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");

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
      "WAITING",
      "ASSIGNED",
    ].includes(normalized)
  ) {
    return "OPEN";
  }

  if (normalized === "PENDING") {
    return "PENDING";
  }

  if (normalized === "COMPLETED") {
    return "COMPLETED";
  }

  if (normalized === "CANCELLED") {
    return "CANCELLED";
  }

  if (normalized === "OPEN") {
    return "OPEN";
  }

  return "MASUK";
}

function parseDate(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function getTicketDate(
  ticket: PerformanceTicket
) {
  return (
    parseDate(
      ticket.waktuKeluhan
    ) ||
    parseDate(ticket.createdAt)
  );
}

function getHandlerName(
  ticket: PerformanceTicket
) {
  return (
    ticket.handler?.employee?.nama ||
    ticket.handler?.email ||
    "PIC tidak tersedia"
  );
}

function getHandlerEmail(
  ticket: PerformanceTicket
) {
  return (
    ticket.handler?.email ||
    "-"
  );
}

function getHandlerEmployee(
  ticket: PerformanceTicket
) {
  return (
    ticket.handler?.employee ||
    null
  );
}

function getInitial(
  name?: string
) {
  return (
    String(name || "?")
      .trim()
      .charAt(0)
      .toUpperCase() || "?"
  );
}

function getCompletionTime(
  ticket: PerformanceTicket
) {
  return (
    parseDate(
      ticket.selesaiPengerjaan
    ) ||
    parseDate(
      ticket.selesaiResponse
    )
  );
}

function getStartTime(
  ticket: PerformanceTicket
) {
  return (
    parseDate(
      ticket.mulaiPengerjaan
    ) ||
    parseDate(
      ticket.waktuKeluhan
    ) ||
    parseDate(ticket.createdAt)
  );
}

function getResolutionHours(
  ticket: PerformanceTicket
) {
  const start =
    getStartTime(ticket);

  const finish =
    getCompletionTime(ticket);

  if (!start || !finish) {
    return null;
  }

  const milliseconds =
    finish.getTime() -
    start.getTime();

  if (milliseconds < 0) {
    return null;
  }

  return (
    milliseconds /
    (1000 * 60 * 60)
  );
}

function getSlaResult(
  ticket: PerformanceTicket
) {
  const deadline =
    parseDate(
      ticket.batasResponse
    );

  const finish =
    parseDate(
      ticket.selesaiResponse
    ) ||
    parseDate(
      ticket.selesaiPengerjaan
    );

  if (!deadline || !finish) {
    return null;
  }

  return finish.getTime() <=
    deadline.getTime()
    ? "ON_TIME"
    : "LATE";
}

function formatAverageTime(
  hours: number | null
) {
  if (
    hours === null ||
    Number.isNaN(hours)
  ) {
    return "-";
  }

  if (hours < 1) {
    const minutes =
      Math.max(
        1,
        Math.round(hours * 60)
      );

    return `${minutes} menit`;
  }

  if (hours < 24) {
    return `${hours.toFixed(
      1
    )} jam`;
  }

  const days = hours / 24;

  return `${days.toFixed(
    1
  )} hari`;
}

function formatDateTime(
  value?: string | null
) {
  const date = parseDate(value);

  if (!date) {
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
      timeZone: "Asia/Jakarta",
    }
  ).format(date);
}

function escapeCsvValue(
  value: unknown
) {
  return `"${String(
    value ?? ""
  ).replace(/"/g, '""')}"`;
}

export default function ITPerformanceRecap() {
  const [
    tickets,
    setTickets,
  ] = useState<
    PerformanceTicket[]
  >([]);

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
    search,
    setSearch,
  ] = useState("");

  const [
    selectedYear,
    setSelectedYear,
  ] = useState(
    String(
      new Date().getFullYear()
    )
  );

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState<MonthFilter>(
      "ALL"
    );

  const [
    selectedHandler,
    setSelectedHandler,
  ] = useState("ALL");

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<Date | null>(
      null
    );

  const loadTickets =
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

          const data =
            await getTickets();

          setTickets(
            data as PerformanceTicket[]
          );

          setLastUpdated(
            new Date()
          );
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Gagal mengambil data kinerja IT."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadTickets(true);
  }, [loadTickets]);

  const yearOptions =
    useMemo(() => {
      const years = tickets
        .map(getTicketDate)
        .filter(
          (
            date
          ): date is Date =>
            date !== null
        )
        .map((date) =>
          date.getFullYear()
        );

      years.push(
        new Date().getFullYear()
      );

      return Array.from(
        new Set(years)
      ).sort(
        (a, b) => b - a
      );
    }, [tickets]);

  const handlerOptions =
    useMemo(() => {
      const map =
        new Map<
          number,
          string
        >();

      tickets.forEach(
        (ticket) => {
          if (
            !ticket.handlerId
          ) {
            return;
          }

          map.set(
            Number(
              ticket.handlerId
            ),
            getHandlerName(ticket)
          );
        }
      );

      return Array.from(
        map.entries()
      )
        .map(
          ([id, name]) => ({
            id,
            name,
          })
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "id-ID"
          )
        );
    }, [tickets]);

  const periodTickets =
    useMemo(() => {
      return tickets.filter(
        (ticket) => {
          if (
            !ticket.handlerId
          ) {
            return false;
          }

          const date =
            getTicketDate(ticket);

          if (!date) {
            return false;
          }

          const matchesYear =
            date.getFullYear() ===
            Number(
              selectedYear
            );

          const matchesMonth =
            selectedMonth ===
            "ALL" ||
            date.getMonth() ===
            Number(
              selectedMonth
            );

          const matchesHandler =
            selectedHandler ===
            "ALL" ||
            Number(
              ticket.handlerId
            ) ===
            Number(
              selectedHandler
            );

          return (
            matchesYear &&
            matchesMonth &&
            matchesHandler
          );
        }
      );
    }, [
      tickets,
      selectedYear,
      selectedMonth,
      selectedHandler,
    ]);

  const performanceData =
    useMemo(() => {
      const grouped =
        new Map<
          number,
          PerformanceTicket[]
        >();

      periodTickets.forEach(
        (ticket) => {
          const handlerId =
            Number(
              ticket.handlerId
            );

          const current =
            grouped.get(
              handlerId
            ) || [];

          current.push(ticket);

          grouped.set(
            handlerId,
            current
          );
        }
      );

      const result: ITPerformance[] =
        [];

      grouped.forEach(
        (
          handlerTickets,
          handlerId
        ) => {
          const sample =
            handlerTickets[0];

          const employee =
            getHandlerEmployee(
              sample
            );

          const countStatus = (
            status: NormalizedStatus
          ) =>
            handlerTickets.filter(
              (ticket) =>
                normalizeStatus(
                  ticket.status
                ) === status
            ).length;

          const completed =
            countStatus(
              "COMPLETED"
            );

          const open =
            countStatus("OPEN");

          const onGoing =
            countStatus(
              "ON_GOING"
            );

          const pending =
            countStatus(
              "PENDING"
            );

          const cancelled =
            countStatus(
              "CANCELLED"
            );

          const assigned =
            handlerTickets.length;

          const active =
            open +
            onGoing +
            pending;

          const completionRate =
            assigned > 0
              ? Math.round(
                (completed /
                  assigned) *
                100
              )
              : 0;

          let onTime = 0;
          let late = 0;

          handlerTickets.forEach(
            (ticket) => {
              if (
                normalizeStatus(
                  ticket.status
                ) !==
                "COMPLETED"
              ) {
                return;
              }

              const slaResult =
                getSlaResult(
                  ticket
                );

              if (
                slaResult ===
                "ON_TIME"
              ) {
                onTime += 1;
              }

              if (
                slaResult ===
                "LATE"
              ) {
                late += 1;
              }
            }
          );

          const slaMeasured =
            onTime + late;

          const slaComplianceRate =
            slaMeasured > 0
              ? Math.round(
                (onTime /
                  slaMeasured) *
                100
              )
              : 0;

          const resolutionTimes =
            handlerTickets
              .filter(
                (ticket) =>
                  normalizeStatus(
                    ticket.status
                  ) ===
                  "COMPLETED"
              )
              .map(
                getResolutionHours
              )
              .filter(
                (
                  value
                ): value is number =>
                  value !== null
              );

          const averageResolutionHours =
            resolutionTimes.length >
              0
              ? resolutionTimes.reduce(
                (
                  total,
                  value
                ) =>
                  total +
                  value,
                0
              ) /
              resolutionTimes.length
              : null;

          result.push({
            handlerId,
            name:
              getHandlerName(
                sample
              ),
            email:
              getHandlerEmail(
                sample
              ),
            nik:
              employee?.nik ||
              "-",
            jobTitle:
              employee?.jobTitle ||
              employee?.jabatan ||
              "-",
            unitKerja:
              employee?.unitKerja ||
              "-",

            assigned,
            open,
            onGoing,
            pending,
            completed,
            cancelled,
            active,
            completionRate,

            onTime,
            late,
            slaMeasured,
            slaComplianceRate,

            averageResolutionHours,
          });
        }
      );

      return result.sort(
        (a, b) => {
          if (
            b.completionRate !==
            a.completionRate
          ) {
            return (
              b.completionRate -
              a.completionRate
            );
          }

          if (
            b.completed !==
            a.completed
          ) {
            return (
              b.completed -
              a.completed
            );
          }

          return a.name.localeCompare(
            b.name,
            "id-ID"
          );
        }
      );
    }, [periodTickets]);

  const filteredPerformance =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return performanceData;
      }

      return performanceData.filter(
        (item) =>
          [
            item.name,
            item.email,
            item.nik,
            item.jobTitle,
            item.unitKerja,
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
      );
    }, [
      performanceData,
      search,
    ]);

  const summary =
    useMemo(() => {
      const assigned =
        periodTickets.length;

      const completed =
        periodTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) === "COMPLETED"
        ).length;

      const active =
        periodTickets.filter(
          (ticket) =>
            [
              "OPEN",
              "ON_GOING",
              "PENDING",
            ].includes(
              normalizeStatus(
                ticket.status
              )
            )
        ).length;

      const pending =
        periodTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) === "PENDING"
        ).length;

      const completionRate =
        assigned > 0
          ? Math.round(
            (completed /
              assigned) *
            100
          )
          : 0;

      let onTime = 0;
      let late = 0;

      periodTickets.forEach(
        (ticket) => {
          if (
            normalizeStatus(
              ticket.status
            ) !== "COMPLETED"
          ) {
            return;
          }

          const result =
            getSlaResult(ticket);

          if (
            result ===
            "ON_TIME"
          ) {
            onTime += 1;
          }

          if (
            result === "LATE"
          ) {
            late += 1;
          }
        }
      );

      const measured =
        onTime + late;

      const slaComplianceRate =
        measured > 0
          ? Math.round(
            (onTime /
              measured) *
            100
          )
          : 0;

      const completionTimes =
        periodTickets
          .filter(
            (ticket) =>
              normalizeStatus(
                ticket.status
              ) ===
              "COMPLETED"
          )
          .map(
            getResolutionHours
          )
          .filter(
            (
              value
            ): value is number =>
              value !== null
          );

      const averageResolution =
        completionTimes.length >
          0
          ? completionTimes.reduce(
            (
              total,
              value
            ) =>
              total + value,
            0
          ) /
          completionTimes.length
          : null;

      return {
        totalIT:
          performanceData.length,
        assigned,
        active,
        pending,
        completed,
        completionRate,
        onTime,
        late,
        slaComplianceRate,
        averageResolution,
      };
    }, [
      periodTickets,
      performanceData,
    ]);

  const maximumCompleted =
    Math.max(
      1,
      ...performanceData.map(
        (item) =>
          item.completed
      )
    );

  function resetFilters() {
    setSearch("");
    setSelectedMonth("ALL");
    setSelectedHandler("ALL");
  }

  function exportCsv() {
    const headers = [
      "Nama IT",
      "NIK",
      "Email",
      "Job Title",
      "Unit Kerja",
      "Total Ditugaskan",
      "Open",
      "On Going",
      "Pending",
      "Completed",
      "Dibatalkan",
      "Persentase Penyelesaian",
      "SLA Tepat Waktu",
      "SLA Terlambat",
      "Kepatuhan SLA",
      "Rata-rata Penyelesaian",
    ];

    const rows =
      filteredPerformance.map(
        (item) => [
          item.name,
          item.nik,
          item.email,
          item.jobTitle,
          item.unitKerja,
          item.assigned,
          item.open,
          item.onGoing,
          item.pending,
          item.completed,
          item.cancelled,
          `${item.completionRate}%`,
          item.onTime,
          item.late,
          `${item.slaComplianceRate}%`,
          formatAverageTime(
            item.averageResolutionHours
          ),
        ]
      );

    const csvContent = [
      headers
        .map(escapeCsvValue)
        .join(","),
      ...rows.map((row) =>
        row
          .map(escapeCsvValue)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      [
        "\uFEFF",
        csvContent,
      ],
      {
        type:
          "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;
    anchor.download =
      `rekap-kinerja-it-${selectedYear}.csv`;

    document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full min-w-0 space-y-5 pb-8">
      {/* Header */}
      <section className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-brand-100 bg-white px-6 py-6 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03]">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] overflow-hidden lg:block">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-50 dark:bg-brand-500/10" />

          <div
            className="absolute bottom-6 left-4 h-20 w-44 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(70,95,255,0.28) 1.5px, transparent 1.5px)",
              backgroundSize:
                "16px 16px",
            }}
          />
        </div>

        <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <PerformanceIcon />

              Laporan
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
              Rekap Kinerja IT
            </h1>

            <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
              Pantau jumlah pekerjaan,
              penyelesaian ticket,
              kepatuhan SLA, dan rata-rata
              waktu penanganan setiap IT.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={exportCsv}
              disabled={
                filteredPerformance.length ===
                0
              }
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-4 text-theme-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadIcon />

              Export CSV
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex w-full min-w-0 flex-col justify-between gap-3 rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 sm:flex-row sm:items-center">
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              void loadTickets(
                true
              )
            }
            className="shrink-0 font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Filter */}
      <section className="w-full min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
              Filter Kinerja
            </h2>

            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              Pilih periode dan PIC yang
              ingin ditampilkan.
            </p>
          </div>

          <div className="relative w-full min-w-0 xl:w-[380px]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Cari nama, NIK, email, atau job title..."
              className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[0.8fr_1fr_1.5fr_auto]">
          <div className="relative min-w-0">
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className={filterClass}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>Tahun {year}</option>
              ))}
            </select>
            <SelectArrow />
          </div>

          <div className="relative min-w-0">
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value as MonthFilter)}
              className={filterClass}
            >
              <option value="ALL">Semua Bulan</option>
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={String(index)}>{month}</option>
              ))}
            </select>
            <SelectArrow />
          </div>

          <div className="relative min-w-0">
            <select
              value={selectedHandler}
              onChange={(event) => setSelectedHandler(event.target.value)}
              className={filterClass}
            >
              <option value="ALL">Semua IT HelpDesk</option>
              {handlerOptions.map((handler) => (
                <option key={handler.id} value={String(handler.id)}>{handler.name}</option>
              ))}
            </select>
            <SelectArrow />
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <ResetIcon />

            Reset
          </button>
        </div>

        <p className="mt-3 text-theme-xs text-gray-400">
          Terakhir diperbarui:{" "}
          {lastUpdated
            ? formatDateTime(
              lastUpdated.toISOString()
            )
            : "Belum diperbarui"}
        </p>
      </section>

      {/* Statistik */}
      <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4">
        <StatisticCard label="IT Aktif" value={summary.totalIT} description="Memiliki tugas" color="blue" icon={<TeamIcon />} />
        <StatisticCard label="Ditugaskan" value={summary.assigned} description="Total pekerjaan" color="blue" icon={<AssignedIcon />} />
        <StatisticCard label="Aktif" value={summary.active} description="Belum selesai" color="purple" icon={<ActiveIcon />} />
        <StatisticCard label="Pending" value={summary.pending} description="Ditunda" color="orange" icon={<PendingIcon />} />
        <StatisticCard label="Completed" value={summary.completed} description="Sudah selesai" color="green" icon={<CompletedIcon />} />
        <StatisticCard label="Penyelesaian" value={`${summary.completionRate}%`} description="Completion rate" color="green" icon={<CompletionRateIcon />} />
        <StatisticCard label="Kepatuhan SLA" value={`${summary.slaComplianceRate}%`} description={`${summary.onTime} tepat waktu`} color="blue" icon={<SlaIcon />} />
        <StatisticCard
          label="Rata-rata"
          value={formatAverageTime(summary.averageResolution)}
          description="Waktu penyelesaian"
          color="gray"
          icon={<ClockAverageIcon />}
          smallValue
        />
      </div>

      {/* Grafik */}
      <div className="grid w-full min-w-0 grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
            Penyelesaian Ticket Per IT
          </h2>

          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Perbandingan jumlah ticket
            selesai pada periode terpilih.
          </p>

          {performanceData.length ===
            0 ? (
            <ChartEmptyState />
          ) : (
            <div className="mt-6 space-y-5">
              {performanceData
                .slice(0, 10)
                .map((item) => {
                  const percentage =
                    (item.completed /
                      maximumCompleted) *
                    100;

                  return (
                    <div
                      key={
                        item.handlerId
                      }
                      className="min-w-0"
                    >
                      <div className="mb-2 flex min-w-0 items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
                            {item.name}
                          </p>

                          <p className="mt-0.5 truncate text-theme-xs text-gray-400">
                            {item.jobTitle}
                          </p>
                        </div>

                        <p className="shrink-0 text-theme-sm font-bold text-brand-600 dark:text-brand-400">
                          {item.completed}
                        </p>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-500"
                          style={{
                            width:
                              `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
            Ringkasan SLA
          </h2>

          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Hasil penyelesaian berdasarkan
            batas response.
          </p>

          <div className="mt-6 flex justify-center">
            <SlaCircle
              percentage={
                summary.slaComplianceRate
              }
              measured={
                summary.onTime +
                summary.late
              }
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-xl bg-success-50 p-4 dark:bg-success-500/10">
              <p className="truncate text-theme-xs font-medium text-success-700 dark:text-success-400">
                Tepat Waktu
              </p>

              <p className="mt-2 text-2xl font-bold text-success-700 dark:text-success-400">
                {summary.onTime}
              </p>
            </div>

            <div className="min-w-0 rounded-xl bg-error-50 p-4 dark:bg-error-500/10">
              <p className="truncate text-theme-xs font-medium text-error-700 dark:text-error-400">
                Terlambat
              </p>

              <p className="mt-2 text-2xl font-bold text-error-700 dark:text-error-400">
                {summary.late}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Tabel */}
      <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
            Daftar Kinerja IT
          </h2>

          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Menampilkan{" "}
            {
              filteredPerformance.length
            }{" "}
            IT HelpDesk.
          </p>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredPerformance.length ===
          0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="hidden w-full min-w-0 overflow-x-auto xl:block">
              <table className="w-full min-w-[1150px] table-fixed">
                <colgroup>
                  <col className="w-[19%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[15%]" />
                </colgroup>

                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <TableHeader>
                      IT HelpDesk
                    </TableHeader>

                    <TableHeader align="center">
                      Ditugaskan
                    </TableHeader>

                    <TableHeader align="center">
                      Open
                    </TableHeader>

                    <TableHeader align="center">
                      On Going
                    </TableHeader>

                    <TableHeader align="center">
                      Pending
                    </TableHeader>

                    <TableHeader align="center">
                      Completed
                    </TableHeader>

                    <TableHeader align="center">
                      Penyelesaian
                    </TableHeader>

                    <TableHeader align="center">
                      Kepatuhan SLA
                    </TableHeader>

                    <TableHeader>
                      Rata-rata Waktu
                    </TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {filteredPerformance.map(
                    (
                      item,
                      index
                    ) => (
                      <tr
                        key={
                          item.handlerId
                        }
                        className={`border-t border-gray-100 transition hover:bg-brand-50/60 dark:border-gray-800 dark:hover:bg-brand-500/[0.05] ${index % 2 === 0
                            ? "bg-white dark:bg-transparent"
                            : "bg-gray-50/60 dark:bg-white/[0.02]"
                          }`}
                      >
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                              {getInitial(
                                item.name
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                                {item.name}
                              </p>

                              <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                                {
                                  item.jobTitle
                                }
                              </p>

                              <p className="mt-0.5 truncate text-[11px] text-gray-400">
                                {
                                  item.unitKerja
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <NumberCell
                          value={
                            item.assigned
                          }
                        />

                        <NumberCell
                          value={
                            item.open
                          }
                          color="blue"
                        />

                        <NumberCell
                          value={
                            item.onGoing
                          }
                          color="purple"
                        />

                        <NumberCell
                          value={
                            item.pending
                          }
                          color="orange"
                        />

                        <NumberCell
                          value={
                            item.completed
                          }
                          color="green"
                        />

                        <TableCell align="center">
                          <RateBadge
                            value={
                              item.completionRate
                            }
                          />
                        </TableCell>

                        <TableCell align="center">
                          <div className="flex flex-col items-center gap-1">
                            <RateBadge
                              value={
                                item.slaComplianceRate
                              }
                            />

                            <span className="whitespace-nowrap text-[11px] text-gray-400">
                              {
                                item.onTime
                              }{" "}
                              tepat ·{" "}
                              {item.late}{" "}
                              terlambat
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <p className="font-semibold text-gray-700 dark:text-gray-300">
                            {formatAverageTime(
                              item.averageResolutionHours
                            )}
                          </p>

                          <p className="mt-1 text-theme-xs text-gray-400">
                            Dari{" "}
                            {
                              item.completed
                            }{" "}
                            ticket selesai
                          </p>
                        </TableCell>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 p-4 xl:hidden">
              {filteredPerformance.map(
                (item) => (
                  <article
                    key={
                      item.handlerId
                    }
                    className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        {getInitial(
                          item.name
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-800 dark:text-white/90">
                          {item.name}
                        </h3>

                        <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                          {item.jobTitle}
                        </p>

                        <p className="mt-0.5 truncate text-theme-xs text-gray-400">
                          {item.unitKerja}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MobileMetric
                        label="Ditugaskan"
                        value={
                          item.assigned
                        }
                      />

                      <MobileMetric
                        label="Aktif"
                        value={
                          item.active
                        }
                      />

                      <MobileMetric
                        label="Completed"
                        value={
                          item.completed
                        }
                      />

                      <MobileMetric
                        label="Pending"
                        value={
                          item.pending
                        }
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <MobileInformation
                        label="Penyelesaian"
                        value={`${item.completionRate}%`}
                      />

                      <MobileInformation
                        label="Kepatuhan SLA"
                        value={`${item.slaComplianceRate}%`}
                      />

                      <MobileInformation
                        label="Rata-rata"
                        value={formatAverageTime(
                          item.averageResolutionHours
                        )}
                      />
                    </div>
                  </article>
                )
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const filterClass =
  "h-11 w-full min-w-0 appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-10 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

function StatisticCard({
  label,
  value,
  description,
  color,
  icon,
  smallValue = false,
}: {
  label: string;
  value: number | string;
  description: string;
  color:
  | "blue"
  | "gray"
  | "purple"
  | "orange"
  | "green";
  icon: React.ReactNode;
  smallValue?: boolean;
}) {
  const styles = {
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
        "text-gray-800 dark:text-white/90",
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

  const currentStyle =
    styles[color];

  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${currentStyle.icon}`}
      >
        {icon}
      </div>

      <p className="mt-3 truncate text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate font-bold ${currentStyle.value} ${smallValue
            ? "text-lg"
            : "text-2xl"
          }`}
      >
        {value}
      </p>

      <p className="mt-1 truncate text-[11px] text-gray-400">
        {description}
      </p>
    </div>
  );
}

function SlaCircle({
  percentage,
  measured,
}: {
  percentage: number;
  measured: number;
}) {
  const safePercentage =
    Math.min(
      100,
      Math.max(0, percentage)
    );

  return (
    <div
      className="relative flex h-44 w-44 items-center justify-center rounded-full"
      style={{
        background:
          `conic-gradient(#465fff ${safePercentage}%, #eef2ff ${safePercentage}% 100%)`,
      }}
    >
      <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-inner dark:bg-gray-900">
        <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">
          {safePercentage}%
        </p>

        <p className="mt-1 text-center text-theme-xs text-gray-500 dark:text-gray-400">
          {measured} ticket
          <br />
          terukur
        </p>
      </div>
    </div>
  );
}

function RateBadge({
  value,
}: {
  value: number;
}) {
  let className =
    "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";

  if (value >= 80) {
    className =
      "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  } else if (value >= 50) {
    className =
      "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
  }

  return (
    <span
      className={`inline-flex min-w-[58px] justify-center rounded-full px-2.5 py-1 text-theme-xs font-semibold ${className}`}
    >
      {value}%
    </span>
  );
}

function NumberCell({
  value,
  color = "gray",
}: {
  value: number;
  color?:
  | "gray"
  | "blue"
  | "purple"
  | "orange"
  | "green";
}) {
  const colors = {
    gray:
      "text-gray-700 dark:text-gray-300",
    blue:
      "text-brand-600 dark:text-brand-400",
    purple:
      "text-purple-600 dark:text-purple-400",
    orange:
      "text-warning-700 dark:text-warning-400",
    green:
      "text-success-700 dark:text-success-400",
  };

  return (
    <TableCell align="center">
      <span
        className={`text-base font-bold ${colors[color]}`}
      >
        {value}
      </span>
    </TableCell>
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
      className={`px-4 py-4 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${align === "center"
          ? "text-center"
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
  align?: "left" | "center";
}) {
  return (
    <td
      className={`overflow-hidden px-4 py-4 align-middle text-theme-sm text-gray-600 dark:text-gray-300 ${align === "center"
          ? "text-center"
          : "text-left"
        }`}
    >
      {children}
    </td>
  );
}

function MobileMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800">
      <p className="truncate text-theme-xs text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

function MobileInformation({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <p className="truncate text-theme-xs text-gray-400">
        {label}
      </p>

      <p className="mt-1 truncate text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat kinerja IT...
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <PerformanceIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        Data kinerja tidak ditemukan
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        Belum ada ticket yang ditugaskan
        kepada IT pada periode atau filter
        yang dipilih.
      </p>
    </div>
  );
}

function ChartEmptyState() {
  return (
    <div className="flex min-h-[260px] items-center justify-center text-center">
      <p className="max-w-xs text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        Belum ada data penyelesaian
        ticket untuk ditampilkan.
      </p>
    </div>
  );
}

function PerformanceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 19.5V14.25m5 5.25V9.75m5 9.75V6m5 13.5V3.75"
      />
    </svg>
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
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
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
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={`h-4 w-4 ${spinning
          ? "animate-spin"
          : ""
        }`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992V4.356m-.463 5.455a9 9 0 1 0 2.13 9.467"
      />
    </svg>
  );
}

function ResetIcon() {
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
        d="M16.023 9.348h4.992V4.356m-.463 5.455a9 9 0 1 0 2.13 9.467"
      />
    </svg>
  );
}

function DownloadIcon() {
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
        d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M5.25 19.5h13.5"
      />
    </svg>
  );
}

function SelectArrow() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.125a6.375 6.375 0 0 0-12.75 0M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Zm-4.5 10.5a5.25 5.25 0 0 1 6-5.196" />
    </svg>
  );
}

function AssignedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.5a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 12.804-5.304L19.5 9m0 0V4.5M19.5 9H15m4.5 3a7.5 7.5 0 0 1-12.804 5.304L4.5 15m0 0v4.5M4.5 15H9" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M9.5 8.5v7M14.5 8.5v7" />
    </svg>
  );
}

function CompletedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 2.25 2.25 4.75-5" />
    </svg>
  );
}

function CompletionRateIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v-6m4.5 6V9.75m4.5 7.5V6M4.5 19.5h15" />
    </svg>
  );
}

function SlaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
    </svg>
  );
}

function ClockAverageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}