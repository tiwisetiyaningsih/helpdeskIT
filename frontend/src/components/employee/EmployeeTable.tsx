"use client";

import dynamic from "next/dynamic";
import React, {
    useEffect,
    useMemo,
    useState,
} from "react";
import type { ApexOptions } from "apexcharts";

import {
    deleteEmployee,
    getEmployees,
} from "@/services/employee.service";

import EmployeeModal from "./EmployeeModal";
import {
    POSITION_OPTIONS,
    UNIT_KERJA_OPTIONS,
} from "./employee-options";

const ReactApexChart = dynamic(
    () => import("react-apexcharts"),
    {
        ssr: false,
    }
);

type Employee = {
    id: number;
    nik: string;
    nama: string;
    jabatan: string;
    unitKerja: string;
    jobTitle?: string | null;
    isActive: boolean;
};

type EmployeeResponse = {
    success: boolean;
    message?: string;
    data?: Employee[];
};

type StatusFilter =
    | "ALL"
    | "ACTIVE"
    | "INACTIVE";

type StatisticColor =
    | "blue"
    | "green"
    | "red"
    | "purple"
    | "orange";

const ITEMS_PER_PAGE = 10;

function getInitial(name?: string) {
    const normalized = String(name || "").trim();

    if (!normalized) {
        return "E";
    }

    return normalized.charAt(0).toUpperCase();
}

function normalizePosition(position?: string) {
    return String(position || "")
        .trim()
        .toUpperCase();
}

function getPositionClass(position?: string) {
    const normalized =
        normalizePosition(position);

    if (
        normalized.includes("DIREKSI") ||
        normalized.includes("DIREKTUR")
    ) {
        return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
    }

    if (
        normalized.includes("VP") ||
        normalized.includes("EVP") ||
        normalized.includes("VICE PRESIDENT")
    ) {
        return "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
    }

    if (
        normalized.includes("MANAGER") ||
        normalized.includes("MANAJER")
    ) {
        return "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400";
    }

    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export default function EmployeeTable() {
    const [employees, setEmployees] =
        useState<Employee[]>([]);

    const [search, setSearch] =
        useState("");

    const [positionFilter, setPositionFilter] =
        useState("ALL");

    const [unitFilter, setUnitFilter] =
        useState("ALL");

    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("ALL");

    const [currentPage, setCurrentPage] =
        useState(1);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [isModalOpen, setIsModalOpen] =
        useState(false);

    const [
        selectedEmployee,
        setSelectedEmployee,
    ] = useState<Employee | null>(null);

    const [viewEmployee, setViewEmployee] =
        useState<Employee | null>(null);

    const [
        deleteEmployeeData,
        setDeleteEmployeeData,
    ] = useState<Employee | null>(null);

    const [deleting, setDeleting] =
        useState(false);

    const [
        deleteError,
        setDeleteError,
    ] = useState("");

    const [successModal, setSuccessModal] = useState<{
        open: boolean;
        message: string;
    }>({
        open: false,
        message: "",
    });

    function handleAdd() {
        setSelectedEmployee(null);
        setIsModalOpen(true);
    }

    function handleEdit(employee: Employee) {
        setSelectedEmployee(employee);
        setIsModalOpen(true);
    }

    function handleView(employee: Employee) {
        setViewEmployee(employee);
    }

    function handleCloseModal() {
        setIsModalOpen(false);
        setSelectedEmployee(null);
    }

    async function loadEmployees() {
        setLoading(true);
        setError("");

        try {
            const result =
                (await getEmployees()) as EmployeeResponse;

            if (!result.success) {
                throw new Error(
                    result.message ||
                    "Gagal mengambil data employee."
                );
            }

            setEmployees(result.data || []);
        } catch (error: unknown) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan saat mengambil data employee."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteEmployeeData) {
            return;
        }

        try {
            setDeleting(true);
            setDeleteError("");
            setError("");
            setSuccess("");

            const result =
                await deleteEmployee(
                    deleteEmployeeData.id
                );

            if (!result?.success) {
                throw new Error(
                    result?.message ||
                    "Employee gagal dihapus."
                );
            }

            setEmployees((previous) =>
                previous.filter(
                    (employee) =>
                        employee.id !==
                        deleteEmployeeData.id
                )
            );

            setDeleteEmployeeData(null);

            setSuccessModal({
                open: true,
                message:
                    result.message ||
                    "Employee berhasil dihapus.",
            });
            await loadEmployees();
        } catch (error) {
            console.error(
                "DELETE EMPLOYEE ERROR:",
                error
            );

            setDeleteError(
                error instanceof Error
                    ? error.message
                    : "Gagal menghapus employee."
            );
        } finally {
            setDeleting(false);
        }
    }

    useEffect(() => {
        void loadEmployees();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        positionFilter,
        unitFilter,
        statusFilter,
    ]);

    useEffect(() => {
        if (!success) {
            return;
        }

        const timeoutId =
            window.setTimeout(() => {
                setSuccess("");
            }, 3000);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [success]);

    const statistics = useMemo(() => {
        const active = employees.filter(
            (employee) => employee.isActive
        ).length;

        const inactive =
            employees.length - active;

        const managers = employees.filter(
            (employee) =>
                normalizePosition(
                    employee.jabatan
                ).includes("MANAGER") ||
                normalizePosition(
                    employee.jabatan
                ).includes("MANAJER")
        ).length;

        const itHelpdesk = employees.filter(
            (employee) =>
                String(employee.jobTitle || "")
                    .trim()
                    .toUpperCase()
                    .includes("IT HELPDESK") ||
                String(employee.jobTitle || "")
                    .trim()
                    .toUpperCase()
                    .includes("IT SUPPORT")
        ).length;

        return {
            total: employees.length,
            active,
            inactive,
            managers,
            itHelpdesk,
        };
    }, [employees]);

    const positionChartData =
        useMemo(() => {
            const counts = {
                Direksi: 0,
                "VP/EVP": 0,
                Manager: 0,
                Staff: 0,
            };

            employees.forEach((employee) => {
                const position =
                    normalizePosition(
                        employee.jabatan
                    );

                if (
                    position.includes("DIREKSI") ||
                    position.includes("DIREKTUR")
                ) {
                    counts.Direksi += 1;
                    return;
                }

                if (
                    position.includes("VP") ||
                    position.includes("EVP") ||
                    position.includes(
                        "VICE PRESIDENT"
                    )
                ) {
                    counts["VP/EVP"] += 1;
                    return;
                }

                if (
                    position.includes("MANAGER") ||
                    position.includes("MANAJER")
                ) {
                    counts.Manager += 1;
                    return;
                }

                counts.Staff += 1;
            });

            return counts;
        }, [employees]);

    const chartOptions: ApexOptions = {
        chart: {
            type: "donut",
            fontFamily: "Outfit, sans-serif",
            toolbar: {
                show: false,
            },
        },

        labels: [
            "Direksi",
            "VP/EVP",
            "Manager",
            "Staff",
        ],

        legend: {
            show: false,
        },

        dataLabels: {
            enabled: true,
            formatter: (value) =>
                `${Math.round(Number(value))}%`,
            style: {
                fontSize: "11px",
                fontWeight: 600,
            },
        },

        stroke: {
            width: 3,
            colors: ["#ffffff"],
        },

        plotOptions: {
            pie: {
                donut: {
                    size: "68%",

                    labels: {
                        show: true,

                        name: {
                            show: true,
                            fontSize: "12px",
                            color: "#667085",
                            offsetY: -4,
                        },

                        value: {
                            show: true,
                            fontSize: "22px",
                            fontWeight: 700,
                            color: "#101828",
                            offsetY: 4,
                        },

                        total: {
                            show: true,
                            label: "Total",
                            fontSize: "12px",
                            color: "#667085",

                            formatter: () =>
                                String(employees.length),
                        },
                    },
                },
            },
        },

        tooltip: {
            y: {
                formatter: (value) =>
                    `${value} employee`,
            },
        },

        responsive: [
            {
                breakpoint: 640,
                options: {
                    chart: {
                        height: 220,
                    },
                },
            },
        ],
    };

    const chartSeries = [
        positionChartData.Direksi,
        positionChartData["VP/EVP"],
        positionChartData.Manager,
        positionChartData.Staff,
    ];

    const availableUnits =
        useMemo(() => {
            const units = new Set(
                employees
                    .map((employee) =>
                        employee.unitKerja.trim()
                    )
                    .filter(Boolean)
            );

            UNIT_KERJA_OPTIONS.forEach(
                (unit) => units.add(unit)
            );

            return Array.from(units).sort(
                (a, b) =>
                    a.localeCompare(b, "id-ID")
            );
        }, [employees]);

    const filteredEmployees =
        useMemo(() => {
            const keyword = search
                .trim()
                .toLowerCase();

            return employees.filter(
                (employee) => {
                    const searchableText = [
                        employee.nik,
                        employee.nama,
                        employee.jabatan,
                        employee.unitKerja,
                        employee.jobTitle || "",
                    ]
                        .join(" ")
                        .toLowerCase();

                    const matchesSearch =
                        !keyword ||
                        searchableText.includes(
                            keyword
                        );

                    const matchesPosition =
                        positionFilter === "ALL" ||
                        employee.jabatan ===
                        positionFilter;

                    const matchesUnit =
                        unitFilter === "ALL" ||
                        employee.unitKerja ===
                        unitFilter;

                    const matchesStatus =
                        statusFilter === "ALL" ||
                        (statusFilter === "ACTIVE" &&
                            employee.isActive) ||
                        (statusFilter === "INACTIVE" &&
                            !employee.isActive);

                    return (
                        matchesSearch &&
                        matchesPosition &&
                        matchesUnit &&
                        matchesStatus
                    );
                }
            );
        }, [
            employees,
            search,
            positionFilter,
            unitFilter,
            statusFilter,
        ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredEmployees.length /
            ITEMS_PER_PAGE
        )
    );

    const safeCurrentPage = Math.min(
        currentPage,
        totalPages
    );

    const paginatedEmployees =
        useMemo(() => {
            const start =
                (safeCurrentPage - 1) *
                ITEMS_PER_PAGE;

            return filteredEmployees.slice(
                start,
                start + ITEMS_PER_PAGE
            );
        }, [
            filteredEmployees,
            safeCurrentPage,
        ]);

    const firstShown =
        filteredEmployees.length === 0
            ? 0
            : (safeCurrentPage - 1) *
            ITEMS_PER_PAGE +
            1;

    const lastShown = Math.min(
        safeCurrentPage * ITEMS_PER_PAGE,
        filteredEmployees.length
    );

    return (
        <>
            <div className="space-y-6 pb-8">
                {/* Header */}
                <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-7 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03] sm:px-8">
                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36%] overflow-hidden lg:block">
                        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand-50 dark:bg-brand-500/10" />

                        <div className="absolute right-40 top-10 h-24 w-24 rounded-full bg-brand-100/70 dark:bg-brand-500/10" />

                        <div
                            className="absolute bottom-8 left-4 h-24 w-44 opacity-60"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle, rgba(70,95,255,0.28) 1.5px, transparent 1.5px)",

                                backgroundSize:
                                    "16px 16px",
                            }}
                        />
                    </div>

                    {/* <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                <span className="h-2 w-2 rounded-full bg-brand-500" />

                                Master Data
                            </div>

                            <h1 className="mt-5 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                                Manajemen Employee
                            </h1>

                            <p className="mt-3 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                                Kelola data karyawan yang
                                menggunakan sistem Help Desk
                                IT.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleAdd}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-theme-sm font-semibold text-white shadow-theme-sm transition hover:bg-brand-600"
                        >
                            <PlusIcon />

                            Tambah Employee
                        </button>
                    </div> */}

                    <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                <span className="h-2 w-2 rounded-full bg-brand-500" />
                                Master Data
                            </div>

                            <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                                Manajemen Employee
                            </h1>

                            <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                                Kelola data karyawan yang
                                menggunakan sistem Help Desk
                                IT.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAdd}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-theme-sm font-semibold text-white shadow-theme-sm transition hover:bg-brand-600"
                        >
                            <PlusIcon />

                            Tambah Employee
                        </button>

                    </div>
                </section>

                {error && (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => {
                                setError("");
                                void loadEmployees();
                            }}
                            className="font-semibold underline"
                        >
                            Coba lagi
                        </button>
                    </div>
                )}

                {success && (
                    <div className="rounded-2xl border border-success-200 bg-success-50 px-5 py-4 text-theme-sm font-medium text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400">
                        {success}
                    </div>
                )}

                {/* Statistik */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatisticCard
                        label="Total Employee"
                        value={statistics.total}
                        description="Seluruh karyawan"
                        color="blue"
                        icon={<EmployeeIcon />}
                    />

                    <StatisticCard
                        label="Employee Aktif"
                        value={statistics.active}
                        description="Status aktif"
                        color="green"
                        icon={<CheckIcon />}
                    />

                    <StatisticCard
                        label="Employee Nonaktif"
                        value={statistics.inactive}
                        description="Status nonaktif"
                        color="red"
                        icon={<InactiveIcon />}
                    />

                    <StatisticCard
                        label="Manager"
                        value={statistics.managers}
                        description="Position manager"
                        color="purple"
                        icon={<ManagerIcon />}
                    />

                    <StatisticCard
                        label="IT HelpDesk"
                        value={statistics.itHelpdesk}
                        description="Tim penanganan IT"
                        color="orange"
                        icon={<HelpdeskIcon />}
                    />
                </div>

                {/* Distribusi dan Ringkasan Position */}
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                            Distribusi Position
                        </h2>

                        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                            Perbandingan jumlah employee berdasarkan kelompok position.
                        </p>
                    </div>

                    {employees.length === 0 ? (
                        <div className="flex h-[280px] items-center justify-center text-theme-sm text-gray-400">
                            Belum ada data untuk ditampilkan.
                        </div>
                    ) : (
                        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
                            {/* Diagram Donut */}
                            <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                <div className="w-full max-w-[300px]">
                                    <ReactApexChart
                                        options={chartOptions}
                                        series={chartSeries}
                                        type="donut"
                                        height={280}
                                    />
                                </div>
                            </div>

                            {/* Ringkasan */}
                            <div className="flex flex-col">
                                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                                    <CompactPositionCard
                                        label="Direksi"
                                        value={positionChartData.Direksi}
                                        total={employees.length}
                                        className="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                                    />

                                    <CompactPositionCard
                                        label="VP/EVP"
                                        value={positionChartData["VP/EVP"]}
                                        total={employees.length}
                                        className="bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                                    />

                                    <CompactPositionCard
                                        label="Manager"
                                        value={positionChartData.Manager}
                                        total={employees.length}
                                        className="bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
                                    />

                                    <CompactPositionCard
                                        label="Staff"
                                        value={positionChartData.Staff}
                                        total={employees.length}
                                        className="bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                                    />
                                </div>

                                {/* Legend */}
                                {/* <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/50 sm:grid-cols-2">
                                    <ChartLegend
                                        label="Direksi"
                                        value={positionChartData.Direksi}
                                        total={employees.length}
                                        dotClass="bg-brand-500"
                                    />

                                    <ChartLegend
                                        label="VP/EVP"
                                        value={positionChartData["VP/EVP"]}
                                        total={employees.length}
                                        dotClass="bg-success-500"
                                    />

                                    <ChartLegend
                                        label="Manager"
                                        value={positionChartData.Manager}
                                        total={employees.length}
                                        dotClass="bg-warning-500"
                                    />

                                    <ChartLegend
                                        label="Staff"
                                        value={positionChartData.Staff}
                                        total={employees.length}
                                        dotClass="bg-error-500"
                                    />
                                </div> */}

                                {/* Unit kerja */}
                                <div className="mt-4 flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-gray-600 shadow-theme-xs dark:bg-gray-900 dark:text-gray-300">
                                        <BuildingIcon />
                                    </div>

                                    <div>
                                        <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
                                            Unit Kerja Terdaftar
                                        </p>

                                        <div className="mt-1 flex items-end gap-2">
                                            <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                                                {
                                                    new Set(
                                                        employees
                                                            .map((employee) =>
                                                                employee.unitKerja.trim()
                                                            )
                                                            .filter(Boolean)
                                                    ).size
                                                }
                                            </p>

                                            <p className="pb-1 text-theme-xs text-gray-500 dark:text-gray-400">
                                                unit kerja
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-gray-600 shadow-theme-xs dark:bg-gray-900 dark:text-gray-300">
                                        <BuildingIcon />
                                    </div>

                                    <div>
                                        <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
                                            Job Title Terdaftar
                                        </p>

                                        <div className="mt-1 flex items-end gap-2">
                                            <p className="text-2xl font-bold text-gray-800 dark:text-white/90">
                                                {
                                                    new Set(
                                                        employees
                                                            .map((employee) =>
                                                                employee.jobTitle
                                                            )
                                                            .filter(Boolean)
                                                    ).size
                                                }
                                            </p>

                                            <p className="pb-1 text-theme-xs text-gray-500 dark:text-gray-400">
                                                job title
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Tabel */}
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                                    Daftar Employee
                                </h2>

                                <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                                    Menampilkan {filteredEmployees.length} dari{" "}
                                    {employees.length} employee.
                                </p>
                            </div>

                            <div className="relative w-full xl:w-[380px]">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <SearchIcon />
                                </span>

                                <input
                                    type="text"
                                    placeholder="Cari NIK, nama, job title, atau unit..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                />
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
                            <div className="relative">
                                <select
                                    value={positionFilter}
                                    onChange={(event) => setPositionFilter(event.target.value)}
                                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                >
                                    <option value="ALL">Semua Position</option>

                                    {POSITION_OPTIONS.map((position) => (
                                        <option key={position} value={position}>
                                            {position}
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

                            {/* <div className="relative min-w-0">
                                <select
                                    value={unitFilter}
                                    onChange={(event) => setUnitFilter(event.target.value)}
                                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                >
                                    <option value="ALL">Semua Unit Kerja</option>

                                    {availableUnits.map((unit) => (
                                        <option key={unit} value={unit}>
                                            {unit}
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
                            </div> */}
                            <SearchableSelect
                                value={unitFilter}
                                onChange={setUnitFilter}
                                options={availableUnits}
                                placeholder="Cari unit kerja..."
                                allLabel="Semua Unit Kerja"
                            />

                            <div className="relative min-w-0">
                                <select
                                    value={statusFilter}
                                    onChange={(event) =>
                                        setStatusFilter(event.target.value as StatusFilter)
                                    }
                                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                >
                                    <option value="ALL">Semua Status</option>
                                    <option value="ACTIVE">Aktif</option>
                                    <option value="INACTIVE">Nonaktif</option>
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

                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setPositionFilter("ALL");
                                    setUnitFilter("ALL");
                                    setStatusFilter("ALL");
                                }}
                                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                <ResetIcon />
                                Reset Filter
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <LoadingState />
                    ) : filteredEmployees.length ===
                        0 ? (
                        <EmptyState
                            hasEmployees={
                                employees.length > 0
                            }
                            onAdd={handleAdd}
                        />
                    ) : (
                        <>
                            {/* Desktop */}
                            <div className="hidden overflow-x-auto xl:block">
                                <table className="w-full min-w-[1100px] table-fixed">
                                    <colgroup>
                                        <col className="w-[12%]" />
                                        <col className="w-[21%]" />
                                        <col className="w-[12%]" />
                                        <col className="w-[25%]" />
                                        <col className="w-[15%]" />
                                        <col className="w-[8%]" />
                                        <col className="w-[15%]" />
                                    </colgroup>

                                    <thead className="bg-gray-50/80 dark:bg-gray-900">
                                        <tr className="border-b border-gray-100 dark:border-gray-800">
                                            <TableHeader>
                                                NIK
                                            </TableHeader>

                                            <TableHeader>
                                                Employee
                                            </TableHeader>

                                            <TableHeader>
                                                Position
                                            </TableHeader>

                                            <TableHeader>
                                                Job Title
                                            </TableHeader>

                                            <TableHeader>
                                                Unit Kerja
                                            </TableHeader>

                                            <TableHeader align="center">
                                                Status
                                            </TableHeader>

                                            <TableHeader align="center">
                                                Aksi
                                            </TableHeader>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {paginatedEmployees.map(
                                            (employee) => (
                                                <tr
                                                    key={employee.id}
                                                    className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                                                >
                                                    <TableCell>
                                                        <span
                                                            title={employee.nik}
                                                            className="block truncate text-theme-sm font-medium text-gray-600 dark:text-gray-300"
                                                        >
                                                            {employee.nik}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                                                                {getInitial(
                                                                    employee.nama
                                                                )}
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p
                                                                    title={employee.nama}
                                                                    className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90"
                                                                >
                                                                    {employee.nama}
                                                                </p>

                                                                <p className="mt-0.5 truncate text-theme-xs text-gray-400">
                                                                    {employee.jobTitle || employee.unitKerja}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <span
                                                            className={`inline-flex max-w-full rounded-full px-2.5 py-1.5 text-theme-xs font-semibold ${getPositionClass(
                                                                employee.jabatan
                                                            )}`}
                                                        >
                                                            <span className="truncate">
                                                                {employee.jabatan}
                                                            </span>
                                                        </span>
                                                    </TableCell>

                                                    <TableCell>
                                                        <p
                                                            title={
                                                                employee.jobTitle ||
                                                                "-"
                                                            }
                                                            className="line-clamp-2 text-theme-sm leading-5 text-gray-600 dark:text-gray-300"
                                                        >
                                                            {employee.jobTitle ||
                                                                "-"}
                                                        </p>
                                                    </TableCell>

                                                    <TableCell>
                                                        <p
                                                            title={
                                                                employee.unitKerja
                                                            }
                                                            className="line-clamp-2 text-theme-sm leading-5 text-gray-600 dark:text-gray-300"
                                                        >
                                                            {
                                                                employee.unitKerja
                                                            }
                                                        </p>
                                                    </TableCell>

                                                    <TableCell align="center">
                                                        <StatusBadge
                                                            active={
                                                                employee.isActive
                                                            }
                                                        />
                                                    </TableCell>

                                                    <TableCell align="center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <ActionButton
                                                                title="Lihat"
                                                                onClick={() =>
                                                                    handleView(
                                                                        employee
                                                                    )
                                                                }
                                                            >
                                                                <EyeIcon />
                                                            </ActionButton>

                                                            <ActionButton
                                                                title="Edit"
                                                                onClick={() =>
                                                                    handleEdit(
                                                                        employee
                                                                    )
                                                                }
                                                            >
                                                                <EditIcon />
                                                            </ActionButton>

                                                            <ActionButton
                                                                title="Hapus"
                                                                variant="danger"
                                                                onClick={() => {
                                                                    setDeleteError("");
                                                                    setDeleteEmployeeData(
                                                                        employee
                                                                    );
                                                                }}
                                                            >
                                                                <TrashSmallIcon />
                                                            </ActionButton>
                                                        </div>
                                                    </TableCell>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile */}
                            <div className="space-y-4 p-4 xl:hidden">
                                {paginatedEmployees.map(
                                    (employee) => (
                                        <article
                                            key={employee.id}
                                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                                                    {getInitial(
                                                        employee.nama
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-theme-sm font-bold text-gray-800 dark:text-white/90">
                                                                {employee.nama}
                                                            </h3>

                                                            <p className="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                                                                NIK: {employee.nik}
                                                            </p>
                                                        </div>

                                                        <StatusBadge
                                                            active={
                                                                employee.isActive
                                                            }
                                                        />
                                                    </div>

                                                    <div className="mt-3">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getPositionClass(
                                                                employee.jabatan
                                                            )}`}
                                                        >
                                                            {employee.jabatan}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <MobileInfo
                                                    label="Job Title"
                                                    value={
                                                        employee.jobTitle ||
                                                        "-"
                                                    }
                                                />

                                                <MobileInfo
                                                    label="Unit Kerja"
                                                    value={
                                                        employee.unitKerja
                                                    }
                                                />
                                            </div>

                                            <div className="mt-4 grid grid-cols-3 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleView(employee)
                                                    }
                                                    className="rounded-lg border border-brand-200 px-3 py-2.5 text-theme-xs font-semibold text-brand-600 dark:border-brand-500/30 dark:text-brand-400"
                                                >
                                                    Lihat
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEdit(employee)
                                                    }
                                                    className="rounded-lg border border-gray-300 px-3 py-2.5 text-theme-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteEmployeeData(
                                                            employee
                                                        )
                                                    }
                                                    className="rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-theme-xs font-semibold text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </article>
                                    )
                                )}
                            </div>

                            {/* Pagination */}
                            <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                                    Menampilkan {firstShown}–
                                    {lastShown} dari{" "}
                                    {filteredEmployees.length} employee.
                                </p>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={
                                            safeCurrentPage <= 1
                                        }
                                        onClick={() =>
                                            setCurrentPage(
                                                (previous) =>
                                                    Math.max(
                                                        1,
                                                        previous - 1
                                                    )
                                            )
                                        }
                                        className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-theme-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        Sebelumnya
                                    </button>

                                    <span className="inline-flex h-9 min-w-[84px] items-center justify-center rounded-lg bg-brand-50 px-3 text-theme-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                                        {safeCurrentPage} /{" "}
                                        {totalPages}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={
                                            safeCurrentPage >=
                                            totalPages
                                        }
                                        onClick={() =>
                                            setCurrentPage(
                                                (previous) =>
                                                    Math.min(
                                                        totalPages,
                                                        previous + 1
                                                    )
                                            )
                                        }
                                        className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-theme-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        Berikutnya
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <EmployeeModal
                isOpen={isModalOpen}
                employee={selectedEmployee}
                onClose={handleCloseModal}
                onSuccess={() => {
                    setSuccess(
                        selectedEmployee
                            ? "Data employee berhasil diperbarui."
                            : "Employee berhasil ditambahkan."
                    );

                    void loadEmployees();
                }}
            />

            {viewEmployee && (
                <EmployeeDetailModal
                    employee={viewEmployee}
                    onClose={() =>
                        setViewEmployee(null)
                    }
                    onEdit={() => {
                        const employee = viewEmployee;

                        setViewEmployee(null);
                        handleEdit(employee);
                    }}
                />
            )}

            {deleteEmployeeData && (
                <DeleteEmployeeModal
                    employee={deleteEmployeeData}
                    deleting={deleting}
                    error={deleteError}
                    onClose={() => {
                        if (!deleting) {
                            setDeleteError("");
                            setDeleteEmployeeData(null);
                        }
                    }}
                    onConfirm={() =>
                        void handleDeleteConfirm()
                    }
                />
            )}

            {successModal.open && (
                <SuccessModal
                    message={successModal.message}
                    onClose={() =>
                        setSuccessModal({
                            open: false,
                            message: "",
                        })
                    }
                />
            )}
        </>
    );
}

function EmployeeDetailModal({
    employee,
    onClose,
    onEdit,
}: {
    employee: Employee;
    onClose: () => void;
    onEdit: () => void;
}) {
    return (
        <ModalWrapper onClose={onClose}>
            <div
                //   disini yaa
                className="
          flex max-h-[85vh] w-full max-w-2xl flex-col
      overflow-hidden rounded-3xl bg-white
      shadow-theme-xl dark:bg-gray-900
        "
                onClick={(event) => event.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                            Detail Employee
                        </h2>

                        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                            Informasi lengkap data karyawan.
                        </p>
                    </div>

                    <CloseButton onClick={onClose} />
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* PROFILE CARD */}
                    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-brand-50/60 p-5 dark:border-brand-500/20 dark:from-brand-500/10 dark:via-gray-900 dark:to-brand-500/5">
                        {/* dekorasi */}
                        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand-100/40 dark:bg-brand-500/10" />

                        <div className="relative flex items-center gap-5">
                            {/* INITIAL */}
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-white text-3xl font-bold text-brand-600 shadow-theme-xs dark:border-brand-500/20 dark:bg-gray-900 dark:text-brand-400">
                                {getInitial(employee.nama)}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-2xl font-bold text-gray-800 dark:text-white/90">
                                    {employee.nama}
                                </h3>

                                <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                                    NIK {employee.nik}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex rounded-full px-3 py-1.5 text-theme-xs font-semibold ${getPositionClass(
                                            employee.jabatan
                                        )}`}
                                    >
                                        {employee.jabatan}
                                    </span>

                                    <StatusBadge active={employee.isActive} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION TITLE */}
                    <div className="mt-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                                <EmployeeIcon />
                            </div>

                            <div>
                                <h3 className="text-theme-sm font-bold text-gray-800 dark:text-white/90">
                                    Informasi Employee
                                </h3>

                                <p className="mt-0.5 text-theme-xs text-gray-400">
                                    Data master karyawan
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* INFORMATION LIST */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <EmployeeDetailRow icon={<IdCardIcon />} label="NIK" value={employee.nik} />
                        <EmployeeDetailRow icon={<PersonIcon />} label="Nama" value={employee.nama} />
                        <EmployeeDetailRow icon={<PersonIcon />} label="Position" value={employee.jabatan} />
                        <EmployeeDetailRow icon={<BriefcaseIcon />} label="Job Title" value={employee.jobTitle || "-"} />
                        <EmployeeDetailRow icon={<BuildingIcon />} label="Unit Kerja" value={employee.unitKerja} />
                        <EmployeeDetailRow icon={<CheckCircleIcon />} label="Status" value={employee.isActive ? "Aktif" : "Nonaktif"} />
                    </div>
                </div>

                {/* FOOTER - SELALU TERLIHAT */}
                <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
                    <button
                        type="button"
                        onClick={onClose}
                        className="
              rounded-xl border border-gray-300 bg-white
              px-5 py-2.5 text-theme-sm font-semibold
              text-gray-700 transition hover:bg-gray-50
              dark:border-gray-700 dark:bg-gray-800
              dark:text-gray-300 dark:hover:bg-gray-700
            "
                    >
                        Tutup
                    </button>

                    <button
                        type="button"
                        onClick={onEdit}
                        className="
              inline-flex items-center justify-center gap-2
              rounded-xl bg-brand-500 px-5 py-2.5
              text-theme-sm font-semibold text-white
              shadow-theme-xs transition hover:bg-brand-600
            "
                    >
                        <EditIcon />
                        Edit Employee
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
}

function EmployeeDetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-theme-xs dark:bg-gray-900 dark:text-gray-400">
                {icon}
            </div>

            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                </p>

                <p className="mt-0.5 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                    {value}
                </p>
            </div>
        </div>
    );
}

function DeleteEmployeeModal({
    employee,
    deleting,
    error,
    onClose,
    onConfirm,
}: {
    employee: Employee;
    deleting: boolean;
    error: string;
    onClose: () => void;
    onConfirm: () => void;
}) {
    return (
        <ModalWrapper onClose={onClose}>
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-theme-xl dark:bg-gray-900"
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="p-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400">
                        <TrashIcon />
                    </div>

                    <h2 className="mt-5 text-xl font-bold text-gray-800 dark:text-white/90">
                        Hapus Employee?
                    </h2>

                    <p className="mt-3 text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                        Data employee berikut akan dihapus
                        secara permanen.
                    </p>

                    <div className="mt-4 rounded-xl bg-gray-50 px-4 py-4 dark:bg-gray-800">
                        <p className="font-semibold text-gray-800 dark:text-white/90">
                            {employee.nama}
                        </p>

                        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                            NIK: {employee.nik}
                        </p>
                    </div>

                    <p className="mt-4 text-theme-xs text-error-600 dark:text-error-400">
                        Data yang dihapus tidak dapat
                        dikembalikan.
                    </p>
                    {error && (
                        <div className="mt-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-left text-theme-xs font-medium text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                            {error}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-theme-sm font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                    >
                        Batal
                    </button>

                    <button
                        type="button"
                        disabled={deleting}
                        onClick={onConfirm}
                        className="rounded-lg bg-error-500 px-4 py-2.5 text-theme-sm font-semibold text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {deleting
                            ? "Menghapus..."
                            : "Ya, Hapus"}
                    </button>
                </div>
            </div>
        </ModalWrapper>
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
            icon: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
            value:
                "text-brand-600 dark:text-brand-400",
        },

        green: {
            icon: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
            value:
                "text-success-700 dark:text-success-400",
        },

        red: {
            icon: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
            value:
                "text-error-600 dark:text-error-400",
        },

        purple: {
            icon: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
            value:
                "text-purple-600 dark:text-purple-400",
        },

        orange: {
            icon: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
            value:
                "text-warning-700 dark:text-warning-400",
        },
    };

    const currentStyle = styles[color];

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${currentStyle.icon}`}
            >
                {icon}
            </div>

            <p className="mt-4 text-theme-sm font-medium text-gray-500 dark:text-gray-400">
                {label}
            </p>

            <div className="mt-2 flex items-end justify-between gap-3">
                <p
                    className={`text-3xl font-bold ${currentStyle.value}`}
                >
                    {value}
                </p>

                <span className="text-right text-theme-xs text-gray-400">
                    {description}
                </span>
            </div>
        </div>
    );
}

function PositionSummary({
    label,
    value,
    total,
    className,
}: {
    label: string;
    value: number;
    total: number;
    className: string;
}) {
    const percentage =
        total > 0
            ? Math.round((value / total) * 100)
            : 0;

    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-center justify-between gap-3">
                <span
                    className={`rounded-full px-3 py-1.5 text-theme-xs font-semibold ${className}`}
                >
                    {label}
                </span>

                <span className="text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                    {percentage}%
                </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90">
                {value}
            </p>

            <p className="mt-1 text-theme-xs text-gray-400">
                Employee
            </p>
        </div>
    );
}

function ChartLegend({
    label,
    value,
    total,
    dotClass,
}: {
    label: string;
    value: number;
    total: number;
    dotClass: string;
}) {
    const percentage =
        total > 0
            ? Math.round((value / total) * 100)
            : 0;

    return (
        <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
            <div className="flex min-w-0 items-center gap-2.5">
                <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
                />

                <span className="truncate text-theme-sm font-medium text-gray-600 dark:text-gray-300">
                    {label}
                </span>
            </div>

            <span className="shrink-0 text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                {value} ({percentage}%)
            </span>
        </div>
    );
}

function CompactPositionCard({
    label,
    value,
    total,
    className,
}: {
    label: string;
    value: number;
    total: number;
    className: string;
}) {
    const percentage =
        total > 0
            ? Math.round((value / total) * 100)
            : 0;

    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-center justify-between gap-2">
                <span
                    className={`inline-flex min-w-0 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${className}`}
                >
                    <span className="truncate">
                        {label}
                    </span>
                </span>

                <span className="text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                    {percentage}%
                </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-gray-800 dark:text-white/90">
                {value}
            </p>

            <p className="mt-0.5 text-theme-xs text-gray-400">
                Employee
            </p>
        </div>
    );
}

function StatusBadge({
    active,
}: {
    active: boolean;
}) {
    return (
        <span
            className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${active
                ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
                }`}
        >
            {active ? "Aktif" : "Nonaktif"}
        </span>
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

function ActionButton({
    children,
    title,
    variant = "default",
    onClick,
}: {
    children: React.ReactNode;
    title: string;
    variant?: "default" | "danger";
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${variant === "danger"
                ? "border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
                : "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
        >
            {children}
        </button>
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
            <p className="text-theme-xs uppercase tracking-wide text-gray-400">
                {label}
            </p>

            <p className="mt-1.5 break-words text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                {value}
            </p>
        </div>
    );
}

function DetailItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
            <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
                {label}
            </p>

            <p className="mt-1.5 break-words text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
                {value}
            </p>
        </div>
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
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <div
                onMouseDown={(event) => {
                    event.stopPropagation();
                }}
            >
                {children}
            </div>
        </div>
    );
}

function CloseButton({
    onClick,
}: {
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Tutup modal"
        >
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
                    d="M6 18 18 6M6 6l12 12"
                />
            </svg>
        </button>
    );
}

function LoadingState() {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                Memuat data employee...
            </p>
        </div>
    );
}

function EmptyState({
    hasEmployees,
    onAdd,
}: {
    hasEmployees: boolean;
    onAdd: () => void;
}) {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                <EmployeeIcon />
            </div>

            <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
                Employee tidak ditemukan
            </h3>

            <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                {hasEmployees
                    ? "Tidak ada employee yang sesuai dengan pencarian atau filter yang dipilih."
                    : "Belum ada data employee pada sistem."}
            </p>

            {!hasEmployees && (
                <button
                    type="button"
                    onClick={onAdd}
                    className="mt-5 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-semibold text-white hover:bg-brand-600"
                >
                    Tambah Employee
                </button>
            )}
        </div>
    );
}

function PlusIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
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

function EmployeeIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-6 w-6"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.125a6.375 6.375 0 0 0-12.75 0M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Zm-4.5 10.5a5.25 5.25 0 0 1 6-5.196"
            />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-6 w-6"
        >
            <circle cx="12" cy="12" r="9" />

            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.5 12 2.25 2.25 4.75-5"
            />
        </svg>
    );
}

function InactiveIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-6 w-6"
        >
            <circle cx="12" cy="12" r="9" />

            <path
                strokeLinecap="round"
                d="M8.5 12h7"
            />
        </svg>
    );
}

function ManagerIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-6 w-6"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12.75a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-7.5 8.25a7.5 7.5 0 0 1 15 0"
            />
        </svg>
    );
}

function HelpdeskIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-6 w-6"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12a7.5 7.5 0 0 1 15 0v4.5a2.25 2.25 0 0 1-2.25 2.25H15v-6h4.5M4.5 12v6.75H6.75v-6H4.5Zm10.5 6.75v.75A1.5 1.5 0 0 1 13.5 21h-3"
            />
        </svg>
    );
}

function EyeIcon() {
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
                d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
            />

            <circle cx="12" cy="12" r="2.25" />
        </svg>
    );
}

function EditIcon() {
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
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931ZM16.862 4.487 19.5 7.125"
            />
        </svg>
    );
}

function TrashSmallIcon() {
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
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21-1.068 13.883A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-1.327L4.772 5.79m14.456 0H4.772m10.978-.397V4.477c0-1.18-.91-2.165-2.09-2.202a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.202v.916"
            />
        </svg>
    );
}

function BuildingIcon() {
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
                d="M3.75 21h16.5M5.25 21V4.5A1.5 1.5 0 0 1 6.75 3h6A1.5 1.5 0 0 1 14.25 4.5V21m0-12h3A1.5 1.5 0 0 1 18.75 10.5V21M8.25 7.5h3m-3 3h3m-3 3h3m-3 3h3"
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
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-3 w-3"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992V4.356m-.463 5.455a9 9 0 1 0 2.13 9.467"
            />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-7 w-7"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21-1.068 13.883A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-1.327L4.772 5.79m14.456 0H4.772m10.978-.397V4.477c0-1.18-.91-2.165-2.09-2.202a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.202v.916"
            />
        </svg>
    );
}

// function IdCardIcon() {
//   return (
//     <svg
//       xmlns="http://www.w3.org/2000/svg"
//       fill="none"
//       viewBox="0 0 24 24"
//       strokeWidth={1.7}
//       stroke="currentColor"
//       className="h-5 w-5"
//     >
//       <rect x="3" y="5" width="18" height="14" rx="2" />
//       <circle cx="8" cy="11" r="2" />
//       <path strokeLinecap="round" d="M6 16c.8-1.3 3.2-1.3 4 0M13 10h5M13 14h4" />
//     </svg>
//   );
// }

function PositionIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-5 w-5"
        >
            <circle cx="12" cy="7" r="3" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"
            />
        </svg>
    );
}

function JobIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.7}
            stroke="currentColor"
            className="h-5 w-5"
        >
            <rect x="3" y="7" width="18" height="13" rx="2" />
            <path strokeLinecap="round" d="M9 7V5h6v2M3 12h18" />
        </svg>
    );
}

function BuildingDetailIcon() {
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
                d="M5 21V4h10v17M15 9h4v12M8 8h4M8 12h4M8 16h4"
            />
        </svg>
    );
}

function IdCardIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
            />
            <circle cx="8" cy="11" r="2" />
            <path d="M6 16c.6-1.5 1.6-2.2 3-2.2S11.4 14.5 12 16" />
            <path d="M14 9h4" />
            <path d="M14 13h4" />
        </svg>
    );
}

function PersonIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <circle cx="12" cy="8" r="3" />
            <path
                d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

function BriefcaseIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <rect
                x="3"
                y="7"
                width="18"
                height="13"
                rx="2"
            />
            <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
            <path d="M3 12h18" />
        </svg>
    );
}

function CheckCircleIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <circle cx="12" cy="12" r="9" />
            <path
                d="m8.5 12 2.2 2.2 4.8-5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function SuccessModal({
    message,
    onClose,
}: {
    message: string;
    onClose: () => void;
}) {
    return (
        <ModalWrapper onClose={onClose}>
            <div
                className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-theme-xl dark:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
                    <svg
                        className="h-8 w-8 text-success-600"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                    >
                        <path
                            d="m5 13 4 4L19 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                <h2 className="mt-5 text-xl font-bold">
                    Berhasil
                </h2>

                <p className="mt-2 text-gray-500">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="mt-6 w-full rounded-xl bg-brand-500 py-3 font-semibold text-white hover:bg-brand-600"
                >
                    OK
                </button>
            </div>
        </ModalWrapper>
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
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
                setQuery("");
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return options;

        return options.filter((option) =>
            option.toLowerCase().includes(keyword)
        );
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

                <svg
                    className="ml-2 h-4 w-4 shrink-0 text-gray-500"
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
                            onClick={() => {
                                onChange("ALL");
                                setOpen(false);
                                setQuery("");
                            }}
                            className={`block w-full truncate px-4 py-2.5 text-left text-theme-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${value === "ALL"
                                    ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                        >
                            {allLabel}
                        </button>

                        {filteredOptions.length === 0 ? (
                            <p className="px-4 py-3 text-theme-xs text-gray-400">
                                Tidak ditemukan.
                            </p>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        onChange(option);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                    className={`block w-full truncate px-4 py-2.5 text-left text-theme-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${value === option
                                            ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                                            : "text-gray-700 dark:text-gray-300"
                                        }`}
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