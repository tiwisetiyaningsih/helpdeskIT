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

type StatusFilter =
    | "ALL"
    | "MASUK"
    | "OPEN"
    | "ON_GOING"
    | "PENDING"
    | "COMPLETED"

type PriorityFilter =
    | "ALL"
    | "1"
    | "2"
    | "3"
    | "4";

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

type RecapStatus =
    | "MASUK"
    | "OPEN"
    | "ON_GOING"
    | "PENDING"
    | "COMPLETED"

type MonthlyRecap = {
    monthIndex: number;
    monthName: string;
    masuk: number;
    open: number;
    onGoing: number;
    pending: number;
    completed: number;
    total: number;
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

const UNIT_KERJA_OPTIONS = [
    "Railway Telecommunication and Electrification",
    "Project Installation and Maintenance",
    "Quality Management System",
    "Project Quality Control and Testing",
    "Project Management",
    "Finance",
    "General Affairs and HSSE",
    "Logistics",
    "Information Systems",
    "Production",
    "Technology and Operation",
    "Human Capital",
    "Assistant Designer",
    "Corporate Secretary",
    "Railway Signalling",
    "Accounting",
    "Systems and Construction Engineering",
    "Finance and Human Capital",
    "Research and Development",
    "Business Development",
    "Sales",
    "Marketing and Sales",
    "Dep - Assistant Designer",
    "Internal Control",
    "Corporate Planning and Evaluation",
    "Marketing",
    "Sales Engineering",
    "Governance, Risk Management, Compliance and Management System",
    "Product Development",
    "Engineering",
    "Quality Management",
];

function normalizeStatus(
    status?: string
): RecapStatus {
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

    if (
        normalized === "OPEN"
    ) {
        return "OPEN";
    }

    if (
        normalized === "ON_GOING"
    ) {
        return "ON_GOING";
    }

    if (
        normalized === "PENDING"
    ) {
        return "PENDING";
    }

    if (
        normalized === "COMPLETED"
    ) {
        return "COMPLETED";
    }

    return "MASUK";
}

function getStatusLabel(
    status?: string
) {
    const labels: Record<
        RecapStatus,
        string
    > = {
        MASUK: "Masuk",
        OPEN: "Open",
        ON_GOING: "On Going",
        PENDING: "Pending",
        COMPLETED: "Completed",
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

    }
}

function getPriorityLabel(
    priority?: number
) {
    const labels: Record<
        number,
        string
    > = {
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

function getPrioritySource(
    priority?: number
) {
    const labels: Record<
        number,
        string
    > = {
        1: "Direksi",
        2: "VP/EVP",
        3: "Manager",
        4: "Staff",
    };

    return (
        labels[priority || 0] ||
        "-"
    );
}

function getPriorityClass(
    priority?: number
) {
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

function getTicketDate(
    ticket: Ticket
) {
    const rawDate =
        ticket.waktuKeluhan ||
        ticket.createdAt;

    const date =
        new Date(rawDate);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}

function getEmployee(
    ticket: Ticket
) {
    return (
        ticket.reporter
            ?.employee ||
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
        "Pelapor tidak tersedia"
    );
}

function getHandlerName(
    ticket: Ticket
) {
    return (
        ticket.handler?.employee
            ?.nama ||
        ticket.handler?.email ||
        "Belum ditugaskan"
    );
}

function escapeCsvValue(
    value: unknown
) {
    const stringValue =
        String(value ?? "");

    return `"${stringValue.replace(
        /"/g,
        '""'
    )}"`;
}

export default function TicketRecap() {
    const [
        tickets,
        setTickets,
    ] =
        useState<Ticket[]>([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

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
        statusFilter,
        setStatusFilter,
    ] =
        useState<StatusFilter>(
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
        unitFilter,
        setUnitFilter,
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
            async () => {
                try {
                    setLoading(true);
                    setError("");

                    const data =
                        await getTickets();

                    setTickets(data);
                    setLastUpdated(
                        new Date()
                    );
                } catch (loadError) {
                    setError(
                        loadError instanceof Error
                            ? loadError.message
                            : "Gagal mengambil rekap ticket."
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );

    useEffect(() => {
        void loadTickets();
    }, [loadTickets]);

    const yearOptions =
        useMemo(() => {
            const years =
                tickets
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

    const unitOptions =
        useMemo(() => {
            const units = new Set(
                tickets
                    .map(
                        (ticket) =>
                            getEmployee(
                                ticket
                            )?.unitKerja?.trim()
                    )
                    .filter(
                        (
                            unit
                        ): unit is string =>
                            Boolean(unit)
                    )
            );

            UNIT_KERJA_OPTIONS.forEach(
                (unit) => units.add(unit)
            );

            return Array.from(units).sort(
                (a, b) =>
                    a.localeCompare(b, "id-ID")
            );
        }, [tickets]);

    const filteredTickets =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLowerCase();

            return tickets
                .filter((ticket) => {
                    const date =
                        getTicketDate(
                            ticket
                        );

                    if (!date) {
                        return false;
                    }

                    const employee =
                        getEmployee(ticket);

                    const searchableText =
                        [
                            ticket.noPelaporan,
                            ticket.keluhan,
                            ticket
                                .kategoriKeluhan ||
                            "",
                            employee?.nik || "",
                            employee?.nama || "",
                            employee?.jabatan ||
                            "",
                            employee?.unitKerja ||
                            "",
                            getHandlerName(
                                ticket
                            ),
                            getStatusLabel(
                                ticket.status
                            ),
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
                        Number(
                            ticket.priority
                        ) ===
                        Number(
                            priorityFilter
                        );

                    const matchesUnit =
                        unitFilter ===
                        "ALL" ||
                        employee?.unitKerja ===
                        unitFilter;

                    return (
                        matchesSearch &&
                        matchesYear &&
                        matchesMonth &&
                        matchesStatus &&
                        matchesPriority &&
                        matchesUnit
                    );
                })
                .sort((a, b) => {
                    const dateA =
                        getTicketDate(a)
                            ?.getTime() || 0;

                    const dateB =
                        getTicketDate(b)
                            ?.getTime() || 0;

                    return dateB - dateA;
                });
        }, [
            tickets,
            search,
            selectedYear,
            selectedMonth,
            statusFilter,
            priorityFilter,
            unitFilter,
        ]);

    const statistics =
        useMemo(() => {
            const countStatus = (
                status: RecapStatus
            ) =>
                filteredTickets.filter(
                    (ticket) =>
                        normalizeStatus(
                            ticket.status
                        ) === status
                ).length;

            const completed =
                countStatus(
                    "COMPLETED"
                );

            const total =
                filteredTickets.length;

            const completionRate =
                total > 0
                    ? Math.round(
                        (completed /
                            total) *
                        100
                    )
                    : 0;

            return {
                total,
                masuk: countStatus("MASUK"),
                open: countStatus("OPEN"),
                onGoing: countStatus("ON_GOING"),
                pending: countStatus("PENDING"),
                completed,
                completionRate,
            };
        }, [filteredTickets]);

    const statusDistribution =
        useMemo(() => {
            return [
                {
                    key: "MASUK",
                    label: "Masuk",
                    value:
                        statistics.masuk,
                    className:
                        "bg-gray-500",
                },
                {
                    key: "OPEN",
                    label: "Open",
                    value:
                        statistics.open,
                    className:
                        "bg-brand-500",
                },
                {
                    key: "ON_GOING",
                    label: "On Going",
                    value:
                        statistics.onGoing,
                    className:
                        "bg-purple-500",
                },
                {
                    key: "PENDING",
                    label: "Pending",
                    value:
                        statistics.pending,
                    className:
                        "bg-warning-500",
                },
                {
                    key: "COMPLETED",
                    label: "Completed",
                    value:
                        statistics.completed,
                    className:
                        "bg-success-500",
                },
            ];
        }, [statistics]);

    const monthlyRecap =
        useMemo(() => {
            const result: MonthlyRecap[] =
                MONTH_NAMES.map(
                    (
                        monthName,
                        monthIndex
                    ) => ({
                        monthIndex,
                        monthName,
                        masuk: 0,
                        open: 0,
                        onGoing: 0,
                        pending: 0,
                        completed: 0,
                        total: 0,
                    })
                );

            tickets.forEach(
                (ticket) => {
                    const date =
                        getTicketDate(
                            ticket
                        );

                    if (
                        !date ||
                        date.getFullYear() !==
                        Number(
                            selectedYear
                        )
                    ) {
                        return;
                    }

                    const month =
                        result[
                        date.getMonth()
                        ];

                    const status =
                        normalizeStatus(
                            ticket.status
                        );

                    month.total += 1;

                    if (
                        status === "MASUK"
                    ) {
                        month.masuk += 1;
                    }

                    if (
                        status === "OPEN"
                    ) {
                        month.open += 1;
                    }

                    if (
                        status ===
                        "ON_GOING"
                    ) {
                        month.onGoing += 1;
                    }

                    if (
                        status ===
                        "PENDING"
                    ) {
                        month.pending += 1;
                    }

                    if (
                        status ===
                        "COMPLETED"
                    ) {
                        month.completed += 1;
                    }
                }
            );

            return result;
        }, [
            tickets,
            selectedYear,
        ]);

    const highestMonthlyTotal =
        Math.max(
            1,
            ...monthlyRecap.map(
                (month) =>
                    month.total
            )
        );

    function resetFilters() {
        setSearch("");
        setSelectedMonth("ALL");
        setStatusFilter("ALL");
        setPriorityFilter("ALL");
        setUnitFilter("ALL");
    }

    function exportCsv() {
        const headers = [
            "No Pelaporan",
            "Waktu Keluhan",
            "NIK",
            "Nama",
            "Jabatan",
            "Unit Kerja",
            "Keluhan",
            "Kategori",
            "Priority",
            "SLA",
            "PIC",
            "Status",
            "Batas Response",
            "Selesai Response",
        ];

        const rows =
            filteredTickets.map(
                (ticket) => {
                    const employee =
                        getEmployee(ticket);

                    return [
                        ticket.noPelaporan,
                        formatDateTime(
                            ticket.waktuKeluhan
                        ),
                        employee?.nik || "-",
                        employee?.nama || "-",
                        employee?.jabatan ||
                        "-",
                        employee?.unitKerja ||
                        "-",
                        ticket.keluhan,
                        ticket
                            .kategoriKeluhan ||
                        "-",
                        getPriorityLabel(
                            ticket.priority
                        ),
                        ticket.sla
                            ? `${ticket.sla} jam`
                            : "-",
                        getHandlerName(
                            ticket
                        ),
                        getStatusLabel(
                            ticket.status
                        ),
                        formatDateTime(
                            ticket.batasResponse
                        ),
                        formatDateTime(
                            ticket.selesaiResponse
                        ),
                    ];
                }
            );

        const csvContent = [
            headers
                .map(escapeCsvValue)
                .join(","),
            ...rows.map((row) =>
                row
                    .map(
                        escapeCsvValue
                    )
                    .join(",")
            ),
        ].join("\n");

        const blob =
            new Blob(
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
            `rekap-ticket-${selectedYear}.csv`;

        document.body.appendChild(
            anchor
        );

        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);
    }

    return (
        <div className="space-y-5 pb-8">
            {/* Header */}
            <section className="relative overflow-hidden rounded-2xl border border-brand-100 bg-white px-6 py-6 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03]">
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

                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                            <ReportIcon />

                            Laporan
                        </div>

                        <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                            Rekap Ticket
                        </h1>

                        <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                            Lihat ringkasan jumlah
                            ticket, distribusi status,
                            dan laporan ticket per
                            periode.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={exportCsv}
                            disabled={
                                filteredTickets.length ===
                                0
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-theme-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <DownloadIcon />

                            Export CSV
                        </button>
                    </div>
                </div>
            </section>

            {error && (
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 sm:flex-row sm:items-center">
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={() =>
                            void loadTickets()
                        }
                        className="font-semibold underline"
                    >
                        Coba lagi
                    </button>
                </div>
            )}

            {/* Filter */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                            Filter Laporan
                        </h2>

                        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                            Pilih periode dan
                            kriteria rekap ticket.
                        </p>
                    </div>

                    <div className="relative w-full xl:w-[380px]">
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
                            placeholder="Cari nomor, nama, NIK, unit, atau keluhan..."
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[0.7fr_1fr_1fr_1fr_1.4fr_auto]">
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(event) => setSelectedYear(event.target.value)}
                            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>

                        <svg
                            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                d="M6 8l4 4 4-4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(event) =>
                                setSelectedMonth(event.target.value as MonthFilter)
                            }
                            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="ALL">Semua Bulan</option>

                            {MONTH_NAMES.map((month, index) => (
                                <option key={month} value={String(index)}>
                                    {month}
                                </option>
                            ))}
                        </select>

                        <svg
                            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                d="M6 8l4 4 4-4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value as StatusFilter)
                            }
                            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="MASUK">Masuk</option>
                            <option value="OPEN">Open</option>
                            <option value="ON_GOING">On Going</option>
                            <option value="PENDING">Pending</option>
                            <option value="COMPLETED">Completed</option>
                        </select>

                        <svg
                            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                d="M6 8l4 4 4-4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <div className="relative">
                        <select
                            value={priorityFilter}
                            onChange={(event) =>
                                setPriorityFilter(event.target.value as PriorityFilter)
                            }
                            className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="ALL">Semua Priority</option>
                            <option value="1">Direksi</option>
                            <option value="2">VP/EVP</option>
                            <option value="3">Manager</option>
                            <option value="4">Staff</option>
                        </select>

                        <svg
                            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                d="M6 8l4 4 4-4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <SearchableSelect
                        value={unitFilter}
                        onChange={setUnitFilter}
                        options={unitOptions}
                        placeholder="Cari unit kerja..."
                        allLabel="Semua Unit Kerja"
                    />

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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                <StatisticCard label="Total" value={statistics.total} description="Seluruh ticket" color="blue" icon={<DocumentIcon />} />
                <StatisticCard label="Masuk" value={statistics.masuk} description="Belum ditugaskan" color="gray" icon={<InboxIcon />} />
                <StatisticCard label="Open" value={statistics.open} description="Sudah ditugaskan" color="blue" icon={<OpenIcon />} />
                <StatisticCard label="On Going" value={statistics.onGoing} description="Sedang dikerjakan" color="purple" icon={<ProcessIcon />} />
                <StatisticCard label="Pending" value={statistics.pending} description="Ditunda" color="orange" icon={<PauseIcon />} />
                <StatisticCard label="Completed" value={statistics.completed} description="Sudah selesai" color="green" icon={<CheckIcon />} />
                <StatisticCard label="Penyelesaian" value={`${statistics.completionRate}%`} description="Completion rate" color="green" icon={<CheckIcon />} />
            </div>

            {/* Grafik dan distribusi */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                        Frekuensi Ticket Per Bulan
                    </h2>

                    <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                        Jumlah ticket masuk
                        selama tahun{" "}
                        {selectedYear}.
                    </p>

                    <div className="mt-6 space-y-3">
                        {monthlyRecap.map(
                            (month) => {
                                const percentage =
                                    (month.total /
                                        highestMonthlyTotal) *
                                    100;

                                return (
                                    <div
                                        key={
                                            month.monthIndex
                                        }
                                        className="grid grid-cols-[80px_1fr_36px] items-center gap-3"
                                    >
                                        <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                                            {month.monthName.slice(
                                                0,
                                                3
                                            )}
                                        </p>

                                        <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                            <div
                                                className="h-full rounded-full bg-brand-500 transition-all"
                                                style={{
                                                    width:
                                                        `${percentage}%`,
                                                }}
                                            />
                                        </div>

                                        <p className="text-right text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                                            {month.total}
                                        </p>
                                    </div>
                                );
                            }
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                        Distribusi Status
                    </h2>

                    <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                        Perbandingan status
                        ticket hasil filter.
                    </p>

                    <div className="mt-6 space-y-4">
                        {statusDistribution.map(
                            (item) => {
                                const percentage =
                                    statistics.total > 0
                                        ? Math.round(
                                            (item.value /
                                                statistics.total) *
                                            100
                                        )
                                        : 0;

                                return (
                                    <div
                                        key={item.key}
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`h-2.5 w-2.5 rounded-full ${item.className}`}
                                                />

                                                <span className="text-theme-sm font-medium text-gray-600 dark:text-gray-300">
                                                    {item.label}
                                                </span>
                                            </div>

                                            <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                                                {item.value}
                                                <span className="ml-1 text-theme-xs font-normal text-gray-400">
                                                    ({percentage}
                                                    %)
                                                </span>
                                            </p>
                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                            <div
                                                className={`h-full rounded-full ${item.className}`}
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
            </div>

            {/* Rekap bulanan */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                        Rekap Status Per Bulan
                    </h2>

                    <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                        Ringkasan status ticket
                        setiap bulan pada tahun{" "}
                        {selectedYear}.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px]">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <TableHeader>
                                    Bulan
                                </TableHeader>

                                <TableHeader align="center">
                                    Masuk
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
                                    Total
                                </TableHeader>

                                <TableHeader align="center">
                                    Persentase
                                </TableHeader>
                            </tr>
                        </thead>

                        <tbody>
                            {monthlyRecap.map(
                                (
                                    month,
                                    index
                                ) => {
                                    const percentage =
                                        month.total > 0
                                            ? Math.round(
                                                (month.completed /
                                                    month.total) *
                                                100
                                            )
                                            : 100;

                                    return (
                                        <tr
                                            key={
                                                month.monthIndex
                                            }
                                            className={`border-t border-gray-100 transition hover:bg-brand-50/50 dark:border-gray-800 dark:hover:bg-brand-500/[0.04] ${index % 2 ===
                                                0
                                                ? "bg-white dark:bg-transparent"
                                                : "bg-gray-50/60 dark:bg-white/[0.02]"
                                                }`}
                                        >
                                            <TableCell bold>
                                                {
                                                    month.monthName
                                                }
                                            </TableCell>

                                            <TableCell align="center">
                                                {
                                                    month.masuk
                                                }
                                            </TableCell>

                                            <TableCell align="center">
                                                {
                                                    month.open
                                                }
                                            </TableCell>

                                            <TableCell align="center">
                                                {
                                                    month.onGoing
                                                }
                                            </TableCell>

                                            <TableCell align="center">
                                                {
                                                    month.pending
                                                }
                                            </TableCell>

                                            <TableCell align="center">
                                                {
                                                    month.completed
                                                }
                                            </TableCell>

                                            <TableCell
                                                align="center"
                                                bold
                                            >
                                                {
                                                    month.total
                                                }
                                            </TableCell>

                                            <TableCell align="center">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${percentage >=
                                                        80
                                                        ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                                                        : percentage >=
                                                            50
                                                            ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
                                                            : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                                                        }`}
                                                >
                                                    {
                                                        percentage
                                                    }
                                                    %
                                                </span>
                                            </TableCell>
                                        </tr>
                                    );
                                }
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Detail ticket */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                        Detail Rekap Ticket
                    </h2>

                    <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                        Menampilkan{" "}
                        {
                            filteredTickets.length
                        }{" "}
                        ticket berdasarkan filter.
                    </p>
                </div>

                {loading ? (
                    <LoadingState />
                ) : filteredTickets.length ===
                    0 ? (
                    <EmptyState />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1150px] table-fixed">
                            <colgroup>
                                <col className="w-[15%]" />
                                <col className="w-[18%]" />
                                <col className="w-[23%]" />
                                <col className="w-[13%]" />
                                <col className="w-[12%]" />
                                <col className="w-[10%]" />
                                <col className="w-[9%]" />
                            </colgroup>

                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <TableHeader>
                                        Ticket
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
                                        PIC
                                    </TableHeader>

                                    <TableHeader>
                                        Status
                                    </TableHeader>

                                    <TableHeader>
                                        Waktu
                                    </TableHeader>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredTickets.map(
                                    (
                                        ticket,
                                        index
                                    ) => {
                                        const employee =
                                            getEmployee(
                                                ticket
                                            );

                                        return (
                                            <tr
                                                key={
                                                    ticket.id
                                                }
                                                className={`border-t border-gray-100 transition hover:bg-brand-50/50 dark:border-gray-800 dark:hover:bg-brand-500/[0.04] ${index % 2 ===
                                                    0
                                                    ? "bg-white dark:bg-transparent"
                                                    : "bg-gray-50/60 dark:bg-white/[0.02]"
                                                    }`}
                                            >
                                                <TableCell>
                                                    <p className="break-all text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                                                        {
                                                            ticket.noPelaporan
                                                        }
                                                    </p>

                                                    <p className="mt-1 truncate text-theme-xs text-gray-400">
                                                        {ticket.kategoriKeluhan ||
                                                            "Kategori belum ditentukan"}
                                                    </p>
                                                </TableCell>

                                                <TableCell>
                                                    <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                                                        {getReporterName(
                                                            ticket
                                                        )}
                                                    </p>

                                                    <p className="mt-1 truncate text-theme-xs text-gray-400">
                                                        {employee?.nik ||
                                                            "-"}{" "}
                                                        ·{" "}
                                                        {employee?.unitKerja ||
                                                            "-"}
                                                    </p>
                                                </TableCell>

                                                <TableCell>
                                                    <p
                                                        title={
                                                            ticket.keluhan
                                                        }
                                                        className="line-clamp-2 text-theme-sm leading-6 text-gray-700 dark:text-gray-300"
                                                    >
                                                        {
                                                            ticket.keluhan
                                                        }
                                                    </p>
                                                </TableCell>

                                                <TableCell>
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getPriorityClass(
                                                            ticket.priority
                                                        )}`}
                                                    >
                                                        {getPriorityLabel(
                                                            ticket.priority
                                                        )}
                                                    </span>

                                                    <p className="mt-1 text-theme-xs text-gray-400">
                                                        {getPrioritySource(
                                                            ticket.priority
                                                        )}
                                                    </p>
                                                </TableCell>

                                                <TableCell>
                                                    <p className="line-clamp-2 text-theme-sm text-gray-700 dark:text-gray-300">
                                                        {getHandlerName(
                                                            ticket
                                                        )}
                                                    </p>
                                                </TableCell>

                                                <TableCell>
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getStatusClass(
                                                            ticket.status
                                                        )}`}
                                                    >
                                                        {getStatusLabel(
                                                            ticket.status
                                                        )}
                                                    </span>
                                                </TableCell>

                                                <TableCell>
                                                    <p className="text-theme-xs leading-5 text-gray-500 dark:text-gray-400">
                                                        {formatDateTime(
                                                            ticket.waktuKeluhan
                                                        )}
                                                    </p>
                                                </TableCell>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
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
    value: number | string;
    description: string;
    color:
    | "blue"
    | "gray"
    | "purple"
    | "orange"
    | "green";
    icon: React.ReactNode;
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
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${currentStyle.icon}`}
            >
                {icon}
            </div>

            <p className="mt-3 truncate text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                {label}
            </p>

            <p
                className={`mt-1 text-2xl font-bold ${currentStyle.value}`}
            >
                {value}
            </p>

            <p className="mt-1 truncate text-[11px] text-gray-400">
                {description}
            </p>
        </div>
    );
}

function TableHeader({
    children,
    align = "left",
}: {
    children: React.ReactNode;
    align?:
    | "left"
    | "center";
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
    bold = false,
}: {
    children: React.ReactNode;
    align?:
    | "left"
    | "center";
    bold?: boolean;
}) {
    return (
        <td
            className={`overflow-hidden px-4 py-4 align-middle text-theme-sm text-gray-600 dark:text-gray-300 ${align === "center"
                ? "text-center"
                : "text-left"
                } ${bold
                    ? "font-semibold text-gray-800 dark:text-white/90"
                    : ""
                }`}
        >
            {children}
        </td>
    );
}

function LoadingState() {
    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                Memuat rekap ticket...
            </p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                <ReportIcon />
            </div>

            <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
                Data rekap tidak ditemukan
            </h3>

            <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Tidak ada ticket yang
                sesuai dengan periode atau
                filter yang dipilih.
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

function ReportIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-4 w-4"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 3.75h9A2.25 2.25 0 0 1 18.75 6v12A2.25 2.25 0 0 1 16.5 20.25h-9A2.25 2.25 0 0 1 5.25 18V6A2.25 2.25 0 0 1 7.5 3.75Z"
            />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 8.25h7.5M8.25 12h7.5M8.25 15.75h4.5"
            />
        </svg>
    );
}

function TicketIcon() {
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
                d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
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

function DocumentIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H6.375A1.125 1.125 0 0 0 5.25 3.375v17.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V6.75L13.5 2.25Z" />
        </svg>
    );
}

function InboxIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 6.75 4.5h10.5l2.25 8.25m-15 0v5.625A1.875 1.875 0 0 0 6.375 20.25h11.25a1.875 1.875 0 0 0 1.875-1.875V12.75h-4.125a3.375 3.375 0 0 1-6.75 0H4.5Z" />
        </svg>
    );
}

function OpenIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
        </svg>
    );
}

function ProcessIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 12.804-5.304L19.5 9m0 0V4.5M19.5 9H15m4.5 3a7.5 7.5 0 0 1-12.804 5.304L4.5 15m0 0v4.5M4.5 15H9" />
        </svg>
    );
}

function PauseIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M9.5 8.5v7M14.5 8.5v7" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 2.25 2.25 4.75-5" />
        </svg>
    );
}

function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = "Semua",
    allLabel = "Semua",
}: {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    allLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return options;
        return options.filter((option) => option.toLowerCase().includes(keyword));
    }, [options, query]);

    const displayValue = value === "ALL" ? allLabel : value;

    return (
        <div className="relative min-w-0" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white pl-4 pr-3 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
                <span className="truncate">{displayValue}</span>
                <svg className="ml-2 h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
                    <div className="border-b border-gray-100 p-2 dark:border-gray-800">
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={placeholder}
                            className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-theme-sm text-gray-700 outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto py-1">
                        <button
                            type="button"
                            onClick={() => { onChange("ALL"); setOpen(false); setQuery(""); }}
                            className={`block w-full truncate px-4 py-2.5 text-left text-theme-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${value === "ALL" ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}
                        >
                            {allLabel}
                        </button>

                        {filteredOptions.length === 0 ? (
                            <p className="px-4 py-3 text-theme-xs text-gray-400">Tidak ditemukan.</p>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => { onChange(option); setOpen(false); setQuery(""); }}
                                    className={`block w-full truncate px-4 py-2.5 text-left text-theme-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${value === option ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}
                                >
                                    {option}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}