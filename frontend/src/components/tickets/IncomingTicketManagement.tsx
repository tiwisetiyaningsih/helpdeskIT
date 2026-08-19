"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Ticket } from "@/services/ticket.service";
import TicketDetailModal from "./TicketDetailModal";
import { apiFetch } from "@/lib/apiFetch";

const API_URL = "http://localhost:3001";
const REFRESH_INTERVAL = 15_000;

type PriorityFilter = "ALL" | "1" | "2" | "3" | "4";
type PicFilter = "ALL" | string;

type Employee = {
  id?: number;
  nik?: string;
  nama?: string;
  jabatan?: string;
  unitKerja?: string;
  jobTitle?: string | null;
};


type ItHelpdeskUser = {
  id: number;
  email?: string;
  employee?: Employee | null;
};

type TicketResponse = {
  success?: boolean;
  message?: string;
  tickets?: Ticket[];
  data?: Ticket[] | { tickets?: Ticket[] };
};

type ItUsersResponse = {
  success?: boolean;
  message?: string;
  users?: ItHelpdeskUser[];
};

type AssignmentResponse = {
  success?: boolean;
  message?: string;
  ticket?: Ticket;
};

type AssignmentForm = {
  handlerId: string;
  kategoriKeluhan: string;
  sla: string;
  selesaiResponse: string;
  keteranganResponse: string;
};

const INITIAL_FORM: AssignmentForm = {
  handlerId: "",
  kategoriKeluhan: "",
  sla: "",
  selesaiResponse: "",
  keteranganResponse: "",
};

const CATEGORY_OPTIONS = [
  "Jaringan",
  "Aplikasi",
  "Data Center",
  "Printer",
  "Laptop/PC",
  "Email",
  "Layanan",
];

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const responseText = await response.text();
    console.error("Response backend:", responseText);
    throw new Error("Backend tidak mengembalikan JSON.");
  }

  return response.json() as Promise<T>;
}

function extractTickets(responseData: TicketResponse): Ticket[] {
  if (Array.isArray(responseData.tickets)) return responseData.tickets;
  if (Array.isArray(responseData.data)) return responseData.data;

  if (
    responseData.data &&
    typeof responseData.data === "object" &&
    Array.isArray(responseData.data.tickets)
  ) {
    return responseData.data.tickets;
  }

  return [];
}

function normalizeStatus(status?: string) {
  return String(status || "MASUK").trim().toUpperCase();
}

function formatPriority(priority?: number) {
  const labels: Record<number, string> = {
    1: "Direksi",
    2: "VP/EVP",
    3: "Manager",
    4: "Staff",
  };

  return labels[priority || 0] || "Belum ditentukan";
}

function getPriorityCode(priority?: number) {
  return priority ? `P${priority}` : "-";
}

function getPriorityFromPosition(position?: string) {
  const normalized = String(position || "").trim().toUpperCase();

  if (normalized.includes("DIREKSI") || normalized.includes("DIREKTUR")) {
    return 1;
  }

  if (
    normalized.includes("VP") ||
    normalized.includes("EVP") ||
    normalized.includes("VICE PRESIDENT")
  ) {
    return 2;
  }

  if (
    normalized.includes("MANAGER") ||
    normalized.includes("MANAJER")
  ) {
    return 3;
  }

  if (normalized.includes("STAFF")) {
    return 4;
  }

  return null;
}

function resolveTicketPriority(ticket: Ticket) {
  const employeePriority = getPriorityFromPosition(
    getReporterEmployee(ticket)?.jabatan
  );

  return employeePriority ?? ticket.priority;
}

function isTicketAssigned(ticket: Ticket) {
  return Boolean(ticket.handlerId) || normalizeStatus(ticket.status) !== "MASUK";
}

function getHandlerName(ticket: Ticket) {
  return (
    ticket.handler?.employee?.nama ||
    ticket.handler?.email ||
    ticket.eskalasi ||
    "-"
  );
}

function getPriorityClass(priority?: number) {
  if (priority === 1) {
    return "border-error-100 bg-error-50 text-error-700 dark:border-error-500/20 dark:bg-error-500/15 dark:text-error-400";
  }

  if (priority === 2) {
    return "border-warning-100 bg-warning-50 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/15 dark:text-warning-400";
  }

  if (priority === 3) {
    return "border-success-100 bg-success-50 text-success-700 dark:border-success-500/20 dark:bg-success-500/15 dark:text-success-400";
  }

  if (priority === 4) {
    return "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }

  return "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function getPriorityDotClass(priority?: number) {
  if (priority === 1) return "bg-error-500";
  if (priority === 2) return "bg-warning-500";
  if (priority === 3) return "bg-success-500";
  return "bg-gray-400";
}

function formatDateTime(value?: string) {
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
  })
    .format(date)
    .replace("pukul", "")
    .trim();
}

function formatRelativeTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const difference = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

function calculateAutomaticDates(
  waktuKeluhan?: string,
  slaValue?: string,
  lamaPendingValue?: number | null
) {
  if (!waktuKeluhan || !slaValue) {
    return { batasResponse: null, estimasiPengerjaan: null };
  }

  const baseDate = new Date(waktuKeluhan);
  const sla = Number(slaValue);

  if (
    Number.isNaN(baseDate.getTime()) ||
    !Number.isInteger(sla) ||
    sla <= 0
  ) {
    return { batasResponse: null, estimasiPengerjaan: null };
  }

  const slaMilliseconds = sla * 60 * 60 * 1000;
  const pendingMilliseconds = Number(lamaPendingValue || 0) * 60 * 1000;

  return {
    batasResponse: new Date(baseDate.getTime() + slaMilliseconds),
    estimasiPengerjaan: new Date(
      baseDate.getTime() + slaMilliseconds + pendingMilliseconds
    ),
  };
}

function getReporterEmployee(ticket: Ticket) {
  return ticket.reporter?.employee || null;
}

function getReporterName(ticket: Ticket) {
  return (
    getReporterEmployee(ticket)?.nama || ticket.reporter?.email || "Pengguna"
  );
}

function getInitial(name?: string) {
  return String(name || "").trim().charAt(0).toUpperCase() || "U";
}

function formatFileSize(size?: number) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getStartOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getLastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return getStartOfDay(date);
  });
}

export default function IncomingTicketManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [itUsers, setItUsers] = useState<ItHelpdeskUser[]>([]);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("ALL");
  const [picFilter, setPicFilter] = useState<PicFilter>("ALL");
  const [periodFilter, setPeriodFilter] = useState("TODAY");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignmentTicket, setAssignmentTicket] = useState<Ticket | null>(null);
  const [assignmentForm, setAssignmentForm] =
    useState<AssignmentForm>(INITIAL_FORM);
  const [formError, setFormError] = useState("");

  const loadData = useCallback(async (showLoading = false) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Sesi login tidak ditemukan.");
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);

      const [ticketResponse, itResponse] = await Promise.all([
        apiFetch(`${API_URL}/tickets`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }),
        apiFetch(`${API_URL}/tickets/it-helpdesk-users`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }),
      ]);

      const ticketData = await parseJson<TicketResponse>(ticketResponse);
      const itData = await parseJson<ItUsersResponse>(itResponse);

      if (!ticketResponse.ok || ticketData.success === false) {
        throw new Error(ticketData.message || "Gagal mengambil data ticket.");
      }

      if (!itResponse.ok || itData.success === false) {
        throw new Error(
          itData.message || "Gagal mengambil daftar IT HelpDesk."
        );
      }

      setTickets(extractTickets(ticketData));
      setItUsers(Array.isArray(itData.users) ? itData.users : []);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat halaman Ticket Masuk."
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(true);
    const intervalId = window.setInterval(() => {
      void loadData(false);
    }, REFRESH_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const incomingTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const priorityA = resolveTicketPriority(a) || 99;
      const priorityB = resolveTicketPriority(b) || 99;

      if (priorityA !== priorityB) return priorityA - priorityB;

      return (
        new Date(b.waktuKeluhan).getTime() -
        new Date(a.waktuKeluhan).getTime()
      );
    });
  }, [tickets]);

  const periodTickets = useMemo(() => {
    const now = new Date();
    const today = getStartOfDay(now).getTime();

    return incomingTickets.filter((ticket) => {
      const ticketDate = new Date(ticket.waktuKeluhan).getTime();
      if (Number.isNaN(ticketDate)) return false;

      if (periodFilter === "TODAY") return ticketDate >= today;
      if (periodFilter === "7_DAYS") {
        return ticketDate >= today - 6 * 24 * 60 * 60 * 1000;
      }
      if (periodFilter === "30_DAYS") {
        return ticketDate >= today - 29 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [incomingTickets, periodFilter]);

  const statistics = useMemo(() => {
    return {
      total: periodTickets.length,
      veryHigh: periodTickets.filter(
        (ticket) => resolveTicketPriority(ticket) === 1
      ).length,
      high: periodTickets.filter(
        (ticket) => resolveTicketPriority(ticket) === 2
      ).length,
      manager: periodTickets.filter(
        (ticket) => resolveTicketPriority(ticket) === 3
      ).length,
      staff: periodTickets.filter(
        (ticket) => resolveTicketPriority(ticket) === 4
      ).length,
    };
  }, [periodTickets]);

  const priorityBreakdown = useMemo(() => {
    const total = periodTickets.length || 1;
    return [1, 2, 3, 4].map((priority) => {
      const count = periodTickets.filter(
        (ticket) => resolveTicketPriority(ticket) === priority
      ).length;
      return {
        priority,
        count,
        percentage: Math.round((count / total) * 100),
      };
    });
  }, [periodTickets]);

  const chartData = useMemo(() => {
    const days = getLastSevenDays();

    return days.map((date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const counts = [1, 2, 3, 4].map(
        (priority) =>
          incomingTickets.filter((ticket) => {
            const ticketDate = new Date(ticket.waktuKeluhan).getTime();
            return (
              resolveTicketPriority(ticket) === priority &&
              ticketDate >= date.getTime() &&
              ticketDate < nextDay.getTime()
            );
          }).length
      );

      return {
        date,
        label: new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "short",
        }).format(date),
        counts,
      };
    });
  }, [incomingTickets]);

  const filteredTickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return periodTickets.filter((ticket) => {
      const employee = getReporterEmployee(ticket);
      const searchableText = [
        ticket.noPelaporan,
        ticket.keluhan,
        employee?.nik || "",
        employee?.nama || "",
        employee?.jabatan || "",
        employee?.unitKerja || "",
        formatPriority(resolveTicketPriority(ticket)),
        getPriorityCode(resolveTicketPriority(ticket)),
        getHandlerName(ticket),
        ticket.kategoriKeluhan || "",
        normalizeStatus(ticket.status),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);
      const matchesPriority =
        priorityFilter === "ALL" ||
        resolveTicketPriority(ticket) === Number(priorityFilter);
      const matchesPic =
        picFilter === "ALL" || String(ticket.handlerId || "") === picFilter;

      return matchesSearch && matchesPriority && matchesPic;
    });
  }, [periodTickets, search, priorityFilter, picFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, priorityFilter, picFilter, periodFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function resetFilters() {
    setSearch("");
    setPriorityFilter("ALL");
    setPicFilter("ALL");
    setPage(1);
  }

  function openAssignmentModal(ticket: Ticket) {
    setAssignmentTicket(ticket);
    setAssignmentForm(INITIAL_FORM);
    setFormError("");
  }

  function closeAssignmentModal() {
    setAssignmentTicket(null);
    setAssignmentForm(INITIAL_FORM);
    setFormError("");
  }

  async function submitAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignmentTicket) return;

    const handlerId = Number(assignmentForm.handlerId);
    const sla = Number(assignmentForm.sla);
    const automaticPriority = resolveTicketPriority(assignmentTicket);

    if (!handlerId || Number.isNaN(handlerId)) {
      setFormError("IT HelpDesk wajib dipilih.");
      return;
    }

    if (!assignmentForm.kategoriKeluhan) {
      setFormError("Kategori keluhan wajib dipilih.");
      return;
    }

    if (!Number.isInteger(sla) || sla <= 0) {
      setFormError("SLA harus berupa jumlah jam lebih dari 0.");
      return;
    }

    if (![1, 2, 3, 4].includes(automaticPriority)) {
      setFormError(
        "Priority tidak dapat ditentukan dari jabatan pelapor."
      );
      return;
    }

    // let selesaiResponseIso: string | null = null;

    // if (assignmentForm.selesaiResponse) {
    //   const selesaiResponseDate = new Date(assignmentForm.selesaiResponse);

    //   if (Number.isNaN(selesaiResponseDate.getTime())) {
    //     setFormError("Tanggal selesai response tidak valid.");
    //     return;
    //   }

    //   selesaiResponseIso = selesaiResponseDate.toISOString();
    // }

    const selectedHandler = itUsers.find((itUser) => itUser.id === handlerId);

    if (!selectedHandler) {
      setFormError("Data IT HelpDesk yang dipilih tidak ditemukan.");
      return;
    }

    const { batasResponse, estimasiPengerjaan } = calculateAutomaticDates(
      assignmentTicket.waktuKeluhan,
      assignmentForm.sla,
      assignmentTicket.lamaPending
    );

    if (!batasResponse || !estimasiPengerjaan) {
      setFormError(
        "Perhitungan batas response dan estimasi pengerjaan gagal."
      );
      return;
    }

    const selectedHandlerName =
      selectedHandler.employee?.nama ||
      selectedHandler.email ||
      `User ${selectedHandler.id}`;

    const token = localStorage.getItem("token");
    if (!token) {
      setFormError("Sesi login tidak ditemukan.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const response = await apiFetch(
        `${API_URL}/tickets/${assignmentTicket.id}/assignment`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            handlerId,
            kategoriKeluhan: assignmentForm.kategoriKeluhan,
            priority: automaticPriority,
            sla,
            eskalasi: selectedHandlerName,
            batasResponse: batasResponse.toISOString(),
            estimasiPengerjaan: estimasiPengerjaan.toISOString(),
            selesaiResponse:
              assignmentForm.selesaiResponse.trim() || null,
            keteranganResponse:
              assignmentForm.keteranganResponse.trim() || null,
          }),
        }
      );

      const data = await parseJson<AssignmentResponse>(response);

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Gagal menugaskan ticket.");
      }

      setAssignmentTicket(null);
      setAssignmentForm(INITIAL_FORM);
      setFormError("");
      setSuccess(data.message || "Ticket berhasil ditugaskan.");
      await loadData(false);
    } catch (assignmentError) {
      setFormError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Gagal menugaskan ticket."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-5 pb-8">
        <PageHeader />

        {error && (
          <AlertMessage type="error" message={error} onRetry={() => void loadData(true)} />
        )}

        {success && <AlertMessage type="success" message={success} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total Ticket Masuk"
            value={statistics.total}
            description="Sesuai periode filter"
            color="blue"
            icon={<TicketIcon />}
          />
          <SummaryCard
            label="Direksi"
            value={statistics.veryHigh}
            description="Perlu penanganan segera"
            color="red"
            icon={<Priority1Icon />}
          />
          <SummaryCard
            label="VP/EVP"
            value={statistics.high}
            description="Perlu ditangani"
            color="orange"
            icon={<Priority2Icon />}
          />
          <SummaryCard
            label="Manager"
            value={statistics.manager}
            description="Prioritas menengah"
            color="green"
            icon={<Priority3Icon />}
          />
          <SummaryCard
            label="Staff"
            value={statistics.staff}
            description="Prioritas normal"
            color="grey"
            icon={<Priority4Icon />}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.55fr]">
          <PrioritySummary
            total={periodTickets.length}
            breakdown={priorityBreakdown}
            periodFilter={periodFilter}
            onPeriodChange={setPeriodFilter}
          />
          <PriorityTrendChart data={chartData} />
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Daftar Ticket Masuk
              </h2>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                Menampilkan {filteredTickets.length} dari {periodTickets.length}{" "}
                ticket sesuai periode. Ticket yang sudah ditugaskan tetap dapat dilihat.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:flex-row xl:w-auto">
              <div className="relative w-full lg:w-[330px]">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nomor, NIK, nama, atau keluhan..."
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              <SelectFilter
                value={priorityFilter}
                onChange={(value) => setPriorityFilter(value as PriorityFilter)}
                options={[
                  { value: "ALL", label: "Semua Priority" },
                  { value: "1", label: "Direksi" },
                  { value: "2", label: "VP/EVP" },
                  { value: "3", label: "Manager" },
                  { value: "4", label: "Staff" },
                ]}
              />

              <SelectFilter
                value={picFilter}
                onChange={setPicFilter}
                options={[
                  { value: "ALL", label: "Semua PIC" },
                  ...itUsers.map((itUser) => ({
                    value: String(itUser.id),
                    label:
                      itUser.employee?.nama ||
                      itUser.email ||
                      `User ${itUser.id}`,
                  })),
                ]}
              />

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <ResetIcon />
                Reset
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredTickets.length === 0 ? (
            <EmptyState hasTickets={periodTickets.length > 0} />
          ) : (
            <>
              <div className="overflow-x-auto px-5 pt-4">
                <table className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <colgroup>
                    <col className="w-[14%]" />
                    <col className="w-[22%]" />
                    <col className="w-[26%]" />
                    <col className="w-[8%]" />
                    <col className="w-[18%]" />
                    <col className="w-[13%]" />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <TableHeader>TICKET</TableHeader>
                      <TableHeader>PELAPOR</TableHeader>
                      <TableHeader>KELUHAN</TableHeader>
                      <TableHeader>PRIORITY</TableHeader>
                      {/* <TableHeader>PIC / STATUS</TableHeader> */}
                      <TableHeader>WAKTU MASUK</TableHeader>
                      <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        AKSI
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginatedTickets.map((ticket, rowIndex) => {
                      const employee = getReporterEmployee(ticket);
                      const name = getReporterName(ticket);
                      const priority = resolveTicketPriority(ticket);
                      const assigned = isTicketAssigned(ticket);

                      return (
                        <tr
                          key={ticket.id}
                          className={`align-top transition hover:bg-brand-50/40 dark:hover:bg-white/[0.03] ${rowIndex % 2 === 1
                            ? "bg-gray-50/50 dark:bg-white/[0.015]"
                            : "bg-white dark:bg-transparent"
                            }`}
                        >
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setSelectedTicket(ticket)}
                              className="max-w-full text-left"
                            >
                              <span className="block break-all text-theme-xs font-bold leading-5 text-brand-600 hover:text-brand-700 dark:text-brand-400">
                                {ticket.noPelaporan}
                              </span>
                            </button>
                          </TableCell>

                          <TableCell>
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                                {getInitial(name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-theme-xs font-bold text-gray-800 dark:text-white/90">
                                  {name}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-gray-500">
                                  NIK {employee?.nik || "-"}
                                </p>
                                <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-gray-400">
                                  {employee?.jabatan || "-"} · {employee?.unitKerja || "-"}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="max-w-[300px]">
                              <p
                                title={ticket.keluhan}
                                className="line-clamp-2 break-words text-theme-xs leading-5 text-gray-700 dark:text-gray-300"
                              >
                                {ticket.keluhan}
                              </p>
                              {ticket.kategoriKeluhan && (
                                <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                  {ticket.kategoriKeluhan}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <PriorityBadge priority={priority} />
                          </TableCell>

                          {/* <TableCell>
                            <div className="space-y-1.5">
                              <StatusBadge assigned={assigned} status={ticket.status} />
                              <p className="line-clamp-1 text-theme-xs font-medium text-gray-600 dark:text-gray-300">
                                {assigned ? getHandlerName(ticket) : "Belum ada PIC"}
                              </p>
                            </div>
                          </TableCell> */}

                          <TableCell>
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 text-gray-400">
                                <CalendarIcon />
                              </span>
                              <div>
                                <p className="text-theme-xs font-medium leading-5 text-gray-600 dark:text-gray-300">
                                  {formatDateTime(ticket.waktuKeluhan)} WIB
                                </p>
                                <p className="mt-0.5 text-[11px] text-gray-400">
                                  {formatRelativeTime(ticket.waktuKeluhan)}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <td className="px-3 py-3.5 align-middle">
                            <div className="flex items-center justify-end">
                              {assigned ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedTicket(ticket)}
                                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-theme-xs font-semibold text-gray-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                  <EyeIcon />
                                  Lihat Detail
                                </button>
                              ) : (
                                <div className="flex w-full flex-col items-stretch gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTicket(ticket)}
                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-theme-xs font-semibold text-gray-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                  >
                                    <EyeIcon />
                                    Detail
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openAssignmentModal(ticket)}
                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 text-theme-xs font-semibold text-white transition hover:bg-brand-600"
                                  >
                                    <AssignIcon />
                                    Tugaskan
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <PaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredTickets.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
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

      {assignmentTicket && (
        <AssignmentModal
          ticket={assignmentTicket}
          itUsers={itUsers}
          form={assignmentForm}
          saving={saving}
          error={formError}
          onChange={setAssignmentForm}
          onClose={closeAssignmentModal}
          onSubmit={submitAssignment}
        />
      )}
    </>
  );
}

function PageHeader() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:px-7">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[360px] lg:block">
        <div className="absolute right-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-brand-50 dark:bg-brand-500/10" />
        <div
          className="absolute bottom-5 left-0 h-16 w-40 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(70,95,255,0.3) 1.4px, transparent 1.4px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="absolute right-14 top-1/2 -translate-y-1/2 text-brand-500">
          <TicketIllustration />
        </div>
      </div>

      {/* <div className="relative">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90 sm:text-[28px]">
          Ticket Masuk
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-theme-sm text-gray-500">
          <span className="font-medium text-gray-600 dark:text-gray-300">Ticketing</span>
          <ChevronRightIcon />
          <span>Ticket Masuk</span>
        </div>
        <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
          Kelola ticket baru yang belum ditugaskan kepada tim IT HelpDesk.
        </p>
      </div> */}

      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            Ticketing
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
            Ticket Masuk
          </h1>

          <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
            Kelola ticket baru yang belum ditugaskan kepada tim IT HelpDesk.
          </p>
        </div>
      </div>
    </section>
  );
}

function AlertMessage({
  type,
  message,
  onRetry,
}: {
  type: "error" | "success";
  message: string;
  onRetry?: () => void;
}) {
  const isError = type === "error";
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border px-5 py-4 text-theme-sm ${isError
        ? "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
        : "border-success-200 bg-success-50 font-medium text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400"
        }`}
    >
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline">
          Coba lagi
        </button>
      )}
    </div>
  );
}

function PrioritySummary({
  total,
  breakdown,
  periodFilter,
  onPeriodChange,
}: {
  total: number;
  breakdown: { priority: number; count: number; percentage: number }[];
  periodFilter: string;
  onPeriodChange: (value: string) => void;
}) {
  const conic = `conic-gradient(#ef4444 0 ${breakdown[0]?.percentage || 0}%, #f97316 ${breakdown[0]?.percentage || 0
    }% ${(breakdown[0]?.percentage || 0) + (breakdown[1]?.percentage || 0)}%, #22c55e ${(breakdown[0]?.percentage || 0) + (breakdown[1]?.percentage || 0)
    }% ${(breakdown[0]?.percentage || 0) +
    (breakdown[1]?.percentage || 0) +
    (breakdown[2]?.percentage || 0)
    }%, #94a3b8 ${(breakdown[0]?.percentage || 0) +
    (breakdown[1]?.percentage || 0) +
    (breakdown[2]?.percentage || 0)
    }% 100%)`;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-gray-800 dark:text-white/90">
          Ringkasan Ticket Masuk
        </h2>
        <div className="relative">
          <select
            value={periodFilter}
            onChange={(event) => onPeriodChange(event.target.value)}
            className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-theme-xs font-medium text-gray-600 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="TODAY">Hari ini</option>
            <option value="7_DAYS">7 hari terakhir</option>
            <option value="30_DAYS">30 hari terakhir</option>
            <option value="ALL">Semua waktu</option>
          </select>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <CalendarIcon />
          </span>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <ChevronDownIcon />
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-center gap-6 sm:grid-cols-[180px_1fr]">
        <div className="relative mx-auto h-36 w-36 rounded-full" style={{ background: conic }}>
          <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-gray-900">
            <span className="text-2xl font-bold text-gray-900 dark:text-white/90">{total}</span>
            <span className="mt-1 text-theme-xs text-gray-400">Total</span>
          </div>
        </div>

        <div className="space-y-4">
          {breakdown.map((item) => (
            <div key={item.priority} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${getPriorityDotClass(item.priority)}`} />
                <span className="text-theme-sm text-gray-600 dark:text-gray-300">
                  {formatPriority(item.priority)} ({getPriorityCode(item.priority)})
                </span>
              </div>
              <span className="text-theme-sm font-semibold text-gray-700 dark:text-gray-200">
                {item.count} <span className="font-normal text-gray-400">({item.percentage}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PriorityTrendChart({
  data,
}: {
  data: { label: string; counts: number[] }[];
}) {
  const width = 700;
  const height = 220;
  const padding = { left: 40, right: 20, top: 25, bottom: 38 };
  const maxCount = Math.max(2, ...data.flatMap((item) => item.counts));
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  const getX = (index: number) =>
    padding.left + (data.length <= 1 ? 0 : (index / (data.length - 1)) * usableWidth);
  const getY = (value: number) =>
    padding.top + usableHeight - (value / maxCount) * usableHeight;

  const series = [
    { priority: 1, stroke: "#ef4444" },
    { priority: 2, stroke: "#f97316" },
    { priority: 3, stroke: "#16a34a" },
    { priority: 4, stroke: "#94a3b8" },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-gray-800 dark:text-white/90">
          Ticket Masuk per Priority (7 Hari Terakhir)
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {series.map((item) => (
            <div key={item.priority} className="flex items-center gap-2 text-theme-xs text-gray-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.stroke }} />
              {getPriorityCode(item.priority)}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px] w-full">
          {[0, 1, 2].map((line) => {
            const value = Math.round((maxCount / 2) * line);
            const y = getY(value);
            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                />
                <text x={12} y={y + 4} fontSize="11" fill="#64748b">
                  {value}
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#cbd5e1"
          />
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={height - padding.bottom}
            y2={height - padding.bottom}
            stroke="#cbd5e1"
          />

          {series.map((item) => {
            const points = data
              .map((day, index) => `${getX(index)},${getY(day.counts[item.priority - 1] || 0)}`)
              .join(" ");

            return (
              <g key={item.priority}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={item.stroke}
                  strokeWidth="2"
                />
                {data.map((day, index) => (
                  <circle
                    key={`${item.priority}-${day.label}`}
                    cx={getX(index)}
                    cy={getY(day.counts[item.priority - 1] || 0)}
                    r="3.5"
                    fill={item.stroke}
                  />
                ))}
              </g>
            );
          })}

          {data.map((day, index) => (
            <text
              key={day.label}
              x={getX(index)}
              y={height - 12}
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
            >
              {day.label}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative min-w-[170px]">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-10 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <ChevronDownIcon />
      </span>
    </div>
  );
}

function PaginationFooter({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-theme-xs text-gray-500">
        Menampilkan {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–
        {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} ticket
      </p>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 dark:border-gray-700"
          >
            <ChevronLeftIcon />
          </button>

          <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-brand-500 px-3 text-theme-sm font-semibold text-white">
            {currentPage}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 dark:border-gray-700"
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="relative">
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-theme-xs font-medium text-gray-600 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value={10}>10 / halaman</option>
            <option value={20}>20 / halaman</option>
            <option value={50}>50 / halaman</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
            <ChevronDownIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

function AssignmentModal({
  ticket,
  itUsers,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  ticket: Ticket;
  itUsers: ItHelpdeskUser[];
  form: AssignmentForm;
  saving: boolean;
  error: string;
  onChange: React.Dispatch<React.SetStateAction<AssignmentForm>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const employee = getReporterEmployee(ticket);
  const selectedHandler = itUsers.find(
    (item) => String(item.id) === form.handlerId
  );
  const selectedHandlerName =
    selectedHandler?.employee?.nama ||
    selectedHandler?.email ||
    "Belum memilih IT HelpDesk";
  const { batasResponse, estimasiPengerjaan } = calculateAutomaticDates(
    ticket.waktuKeluhan,
    form.sla,
    ticket.lamaPending
  );

  return (
    <ModalWrapper onClose={onClose}>
      <form
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                Tugaskan Ticket
              </h2>
              <PriorityBadge priority={resolveTicketPriority(ticket)} />
            </div>
            <p className="mt-1 text-theme-sm font-medium text-brand-600 dark:text-brand-400">
              {ticket.noPelaporan}
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-theme-sm font-medium text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </div>
            )}

            <section className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-400">
                    Pelapor
                  </p>
                  <p className="mt-1 text-theme-sm font-bold text-gray-800 dark:text-white/90">
                    {employee?.nama || ticket.reporter?.email || "-"}
                  </p>
                  <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                    NIK {employee?.nik || "-"} · {employee?.jabatan || "-"} ·{" "}
                    {employee?.unitKerja || "-"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-400">
                    Waktu Keluhan
                  </p>
                  <p className="mt-1 text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
                    {formatDateTime(ticket.waktuKeluhan)} WIB
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-400">
                  Keluhan
                </p>
                <p className="mt-2 whitespace-pre-wrap text-theme-sm leading-6 text-gray-700 dark:text-gray-300">
                  {ticket.keluhan}
                </p>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
                  Informasi Penugasan
                </h3>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  Pilih kategori, petugas IT, dan SLA ticket.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField label="Kategori Keluhan" required>
                  <div className="relative">
                    <select
                      value={form.kategoriKeluhan}
                      disabled={saving}
                      required
                      onChange={(event) =>
                        onChange((previous) => ({
                          ...previous,
                          kategoriKeluhan: event.target.value,
                        }))
                      }
                      className={`${inputClass} appearance-none pr-11`}
                    >
                      <option value="">Pilih kategori keluhan</option>
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <SelectArrow />
                  </div>
                </FormField>

                <FormField label="Priority">
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 dark:border-gray-800 dark:bg-gray-800">
                    <PriorityBadge priority={resolveTicketPriority(ticket)} />
                    <span className="text-right text-[11px] leading-4 text-gray-400">
                      Otomatis dari jabatan pelapor
                    </span>
                  </div>
                </FormField>

                <FormField label="SLA" required hint="Durasi dalam jam">
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={form.sla}
                      disabled={saving}
                      onChange={(event) =>
                        onChange((previous) => ({
                          ...previous,
                          sla: event.target.value,
                        }))
                      }
                      placeholder="Contoh: 4"
                      className={`${inputClass} pr-16`}
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-theme-xs font-medium text-gray-400">
                      Jam
                    </span>
                  </div>
                </FormField>

                <FormField label="Eskalasi" required hint="Pilih IT HelpDesk">
                  <div className="relative">
                    <select
                      value={form.handlerId}
                      disabled={saving}
                      required
                      onChange={(event) =>
                        onChange((previous) => ({
                          ...previous,
                          handlerId: event.target.value,
                        }))
                      }
                      className={`${inputClass} appearance-none pr-11`}
                    >
                      <option value="">Pilih IT HelpDesk</option>
                      {itUsers.map((itUser) => (
                        <option key={itUser.id} value={itUser.id}>
                          {itUser.employee?.nama ||
                            itUser.email ||
                            `User ${itUser.id}`}
                          {itUser.employee?.jobTitle
                            ? ` — ${itUser.employee.jobTitle}`
                            : ""}
                        </option>
                      ))}
                    </select>
                    <SelectArrow />
                  </div>
                </FormField>
              </div>
            </section>

            <section className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5 dark:border-brand-500/20 dark:bg-brand-500/[0.06]">
              <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
                Perhitungan Waktu Otomatis
              </h3>
              <p className="mt-1 text-theme-xs leading-5 text-gray-500 dark:text-gray-400">
                Batas response dihitung dari waktu keluhan ditambah SLA. Estimasi
                pengerjaan juga menambahkan lama pending.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AutomaticDateCard
                  label="Batas Response"
                  value={
                    batasResponse
                      ? `${formatDateTime(batasResponse.toISOString())} WIB`
                      : "Isi SLA terlebih dahulu"
                  }
                />
                <AutomaticDateCard
                  label="Estimasi Pengerjaan"
                  value={
                    estimasiPengerjaan
                      ? `${formatDateTime(estimasiPengerjaan.toISOString())} WIB`
                      : "Isi SLA terlebih dahulu"
                  }
                />
              </div>

              <div className="mt-4 rounded-xl border border-brand-100 bg-white px-4 py-3 dark:border-brand-500/20 dark:bg-gray-900">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-400">
                      IT HelpDesk Terpilih
                    </p>
                    <p className="mt-1 text-theme-sm font-bold text-gray-800 dark:text-white/90">
                      {selectedHandlerName}
                    </p>
                  </div>
                  <p className="text-theme-xs text-gray-400">
                    Lama pending: {ticket.lamaPending || 0} menit
                  </p>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
                  Informasi Response
                </h3>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  Data ini akan tersimpan ke database dan tampil kembali di
                  halaman Detail Ticket.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  label="Selesai Response"
                  hint="Opsional"
                >
                  <input
                    type="text"
                    value={form.selesaiResponse}
                    disabled={saving}
                    placeholder="Masukkan selesai response"
                    onChange={(event) =>
                      onChange((previous) => ({
                        ...previous,
                        selesaiResponse: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Keterangan Response" hint="Opsional">
                  <textarea
                    rows={3}
                    value={form.keteranganResponse}
                    disabled={saving}
                    onChange={(event) =>
                      onChange((previous) => ({
                        ...previous,
                        keteranganResponse: event.target.value,
                      }))
                    }
                    className={textareaClass}
                    placeholder="Tuliskan keterangan response..."
                  />
                </FormField>
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-theme-xs text-gray-400">
            Status ticket akan berubah dari <strong>Masuk</strong> menjadi{" "}
            <strong>Open</strong>.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                !form.handlerId ||
                !form.kategoriKeluhan ||
                !form.sla
              }
              className="inline-flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {saving ? "Menugaskan..." : "Tugaskan Ticket"}
            </button>
          </div>
        </div>
      </form>
    </ModalWrapper>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
const textareaClass =
  "w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-theme-sm text-gray-800 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

function FormField({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-2">
        <label className="block text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="ml-1 text-error-500">*</span>}
        </label>
        {hint && <span className="text-right text-[11px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function AutomaticDateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-white p-4 dark:border-brand-500/20 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          <ClockIcon />
        </div>
        <p className="text-theme-xs font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
      </div>
      <p className="mt-3 text-theme-sm font-bold text-gray-800 dark:text-white/90">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-gray-400">
        Dihitung otomatis oleh sistem
      </p>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
      <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1.5 break-words text-theme-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  assigned,
  status,
}: {
  assigned: boolean;
  status?: string;
}) {
  const normalized = normalizeStatus(status);

  if (!assigned) {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-[11px] font-semibold text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
        <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
        Belum Ditugaskan
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-semibold text-success-700 dark:bg-success-500/15 dark:text-success-400">
      <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
      {normalized === "MASUK" ? "Ditugaskan" : normalized.replaceAll("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: number }) {
  return (
    <div>
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-theme-xs font-semibold ${getPriorityClass(
          priority
        )}`}
      >
        <span className={`h-2 w-2 rounded-full ${getPriorityDotClass(priority)}`} />
        {formatPriority(priority)}
      </span>
      {/* <p className="mt-1 text-theme-xs text-gray-400">{getPriorityCode(priority)}</p> */}
    </div>
  );
}

type SummaryColor = "blue" | "red" | "orange" | "green" | "grey";

function SummaryCard({
  label,
  value,
  description,
  color,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  color: SummaryColor;
  icon: React.ReactNode;
}) {
  const styles: Record<
    SummaryColor,
    {
      icon: string;
      value: string;
    }
  > = {
    blue: {
      icon: "bg-brand-50 text-brand-500 dark:bg-brand-500/15",
      value: "text-brand-600 dark:text-brand-400",
    },
    red: {
      icon: "bg-error-50 text-error-500 dark:bg-error-500/15",
      value: "text-error-600 dark:text-error-400",
    },
    orange: {
      icon: "bg-warning-50 text-warning-600 dark:bg-warning-500/15",
      value: "text-warning-600 dark:text-warning-400",
    },
    green: {
      icon: "bg-success-50 text-success-600 dark:bg-success-500/15",
      value: "text-success-600 dark:text-success-400",
    },
    grey: {
      icon: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
      value: "text-gray-600 dark:text-gray-300",
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p className={`mt-2 text-3xl font-bold ${styles[color].value}`}>
            {value}
          </p>

          <p className="mt-1 text-theme-xs text-gray-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles[color].icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="overflow-hidden px-4 py-3.5 align-middle text-theme-sm text-gray-600 dark:text-gray-300">
      {children}
    </td>
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
      className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Tutup"
    >
      ✕
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
      <p className="text-theme-sm text-gray-500">Memuat ticket masuk...</p>
    </div>
  );
}

function EmptyState({ hasTickets }: { hasTickets: boolean }) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10">
        <TicketIcon />
      </div>
      <h3 className="font-semibold text-gray-800 dark:text-white/90">
        Ticket masuk tidak ditemukan
      </h3>
      <p className="mt-2 max-w-sm text-theme-sm text-gray-500">
        {hasTickets
          ? "Tidak ada ticket yang sesuai dengan pencarian atau filter."
          : "Semua ticket baru sudah ditugaskan kepada IT HelpDesk."}
      </p>
    </div>
  );
}

function SelectArrow() {
  return (
    <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M4 7.5h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4v-3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9.5h6M9 14.5h4" strokeLinecap="round" />
    </svg>
  );
}

function UrgentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m6 10 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path d="M6 21V4m0 1h9l-1.5 3L16 11H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path d="M5 20v-5M12 20V9M19 20V4" strokeLinecap="round" />
    </svg>
  );
}

function Priority1Icon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0M9.283 4.002V12H7.971V5.338h-.065L6.072 6.656V5.385l1.899-1.383z" />
    </svg>
  );
}

function Priority2Icon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8m15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0M6.646 6.24v.07H5.375v-.064c0-1.213.879-2.402 2.637-2.402 1.582 0 2.613.949 2.613 2.215 0 1.002-.6 1.667-1.287 2.43l-.096.107-1.974 2.22v.077h3.498V12H5.422v-.832l2.97-3.293c.434-.475.903-1.008.903-1.705 0-.744-.557-1.236-1.313-1.236-.843 0-1.336.615-1.336 1.306" />
    </svg>
  );
}

function Priority3Icon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M7.918 8.414h-.879V7.342h.838c.78 0 1.348-.522 1.342-1.237 0-.709-.563-1.195-1.348-1.195-.79 0-1.312.498-1.348 1.055H5.275c.036-1.137.95-2.115 2.625-2.121 1.594-.012 2.608.885 2.637 2.062.023 1.137-.885 1.776-1.482 1.875v.07c.703.07 1.71.64 1.734 1.917.024 1.459-1.277 2.396-2.93 2.396-1.705 0-2.707-.967-2.754-2.144H6.33c.059.597.68 1.06 1.541 1.066.973.006 1.6-.563 1.588-1.354-.006-.779-.621-1.318-1.541-1.318" />
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8" />
    </svg>
  );
}

function Priority4Icon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M7.519 5.057q.33-.527.657-1.055h1.933v5.332h1.008v1.107H10.11V12H8.85v-1.559H4.978V9.322c.77-1.427 1.656-2.847 2.542-4.265ZM6.225 9.281v.053H8.85V5.063h-.065c-.867 1.33-1.787 2.806-2.56 4.218" />
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4.5 9A8 8 0 1 1 5 16" strokeLinecap="round" />
      <path d="M4 4.5V9h4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function AssignIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M17 11v6M14 14h6" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="m8 6 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="m12 6-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TicketIllustration() {
  return (
    <svg viewBox="0 0 140 120" className="h-24 w-28" fill="none">
      <path d="M27 67 70 46l43 21-43 25-43-25Z" fill="currentColor" opacity="0.18" />
      <path d="M28 67v25l42 22V92L28 67Z" fill="currentColor" opacity="0.32" />
      <path d="M112 67v25l-42 22V92l42-25Z" fill="currentColor" opacity="0.5" />
      <rect x="65" y="15" width="38" height="54" rx="5" transform="rotate(14 65 15)" fill="white" />
      <path d="m79 29 16 4M76 37l16 4M73 45l12 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <path d="M49 45c0-7 5.5-12.5 12.5-12.5S74 38 74 45c0 9-12.5 17-12.5 17S49 54 49 45Z" fill="currentColor" />
      <circle cx="61.5" cy="45" r="4" fill="white" />
    </svg>
  );
}