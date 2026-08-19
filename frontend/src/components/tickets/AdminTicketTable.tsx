"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getTickets, Ticket } from "@/services/ticket.service";
import TicketDetailModal from "./TicketDetailModal";
import EditTicketModal from "./EditTicketModal";
type StatusFilter = "ALL" | "MASUK" | "OPEN" | "ON_GOING" | "PENDING" | "COMPLETED";
type PriorityFilter = "ALL" | "1" | "2" | "3" | "4";
type ViewMode = "LIST" | "KANBAN";
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
type TicketView = Ticket & {
  reporter?: UserData | null;
  handler?: UserData | null;
  employee?: EmployeeData | null;
  sla?: number | string | null;
  batasResponse?: string | null;
  selesaiResponse?: string | null;
};
type StatisticColor = "blue" | "gray" | "purple" | "orange" | "green";
const REFRESH_INTERVAL = 15_000;
const ITEMS_PER_PAGE = 5;
const CATEGORY_OPTIONS = [
  "Jaringan",
  "Aplikasi",
  "Data Center",
  "Printer",
  "Laptop/PC",
  "Email",
  "Layanan",
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

function normalizeStatus(status?: string) {
  const normalized = String(status || "MASUK").trim().toUpperCase().replace(/[ -]+/g, "_");
  if (["WAITING", "ASSIGNED"].includes(normalized)) return "OPEN";
  if (["IN_PROGRESS", "PROCESS", "PROGRESS", "ONGOING", "DIPROSES"].includes(normalized)) return "ON_GOING";
  if (["RESOLVED", "CLOSED", "SELESAI"].includes(normalized)) return "COMPLETED";
  return normalized;
}
function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    MASUK: "Masuk",
    OPEN: "Open",
    ON_GOING: "On Going",
    PENDING: "Pending",
    COMPLETED: "Completed",
    CANCELLED: "Dibatalkan",
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
      return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }
}
function getPriorityLevel(priority?: number) {
  return ({ 1: "Direksi", 2: "VP/EVP", 3: "Manager", 4: "Staff" } as Record<number, string>)[priority || 0] || "Belum ditentukan";
}
function getPrioritySource(priority?: number) {
  return ({ 1: "Direksi", 2: "VP/EVP", 3: "Manager", 4: "Staff" } as Record<number, string>)[priority || 0] || "-";
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
function getReporterEmployee(ticket: TicketView) {
  return ticket.reporter?.employee || ticket.employee || null;
}
function getReporterName(ticket: TicketView) {
  return getReporterEmployee(ticket)?.nama || ticket.reporter?.email || "Data pelapor tidak tersedia";
}
function getHandlerName(ticket: TicketView) {
  return ticket.handler?.employee?.nama || ticket.handler?.email || "Belum ditugaskan";
}
function getInitial(name?: string) {
  return String(name || "?").trim().charAt(0).toUpperCase() || "?";
}
// Priority dihitung dari jabatan pelapor (sama seperti halaman Ticket Masuk),
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
  const employeePriority = getPriorityFromPosition(getReporterEmployee(ticket)?.jabatan);
  return employeePriority ?? ticket.priority;
}
function getSlaInformation(ticket: TicketView) {
  if (normalizeStatus(ticket.status) === "COMPLETED") {
    return {
      label: ticket.sla ? `SLA ${ticket.sla} jam` : "Selesai",
      detail: "Selesai",
      percentage: 100,
      barClass: "bg-success-500",
      detailClass: "text-success-600 dark:text-success-400",
    };
  }
  if (!ticket.batasResponse) {
    return {
      label: ticket.sla ? `SLA ${ticket.sla} jam` : "SLA belum diatur",
      detail: "Batas response belum tersedia",
      percentage: 0,
      barClass: "bg-gray-300 dark:bg-gray-700",
      detailClass: "text-gray-400",
    };
  }
  const deadline = new Date(ticket.batasResponse);
  if (Number.isNaN(deadline.getTime())) {
    return {
      label: ticket.sla ? `SLA ${ticket.sla} jam` : "SLA tidak valid",
      detail: "Format batas response salah",
      percentage: 0,
      barClass: "bg-gray-300 dark:bg-gray-700",
      detailClass: "text-gray-400",
    };
  }
  const totalHours = Number(ticket.sla || 0);
  const createdAt = new Date(ticket.waktuKeluhan || ticket.createdAt || Date.now()).getTime();
  const deadlineAt = deadline.getTime();
  const now = Date.now();
  const totalDuration = Math.max(deadlineAt - createdAt, totalHours * 60 * 60 * 1000, 1);
  const elapsed = Math.max(0, now - createdAt);
  const percentage = Math.min(100, Math.max(6, (elapsed / totalDuration) * 100));
  const difference = deadlineAt - now;
  const absoluteMinutes = Math.ceil(Math.abs(difference) / 60_000);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  const remaining = `${hours > 0 ? `${hours} jam ` : ""}${minutes} menit`;
  if (difference < 0) {
    return {
      label: ticket.sla ? `SLA ${ticket.sla} jam` : "SLA",
      detail: `${remaining} terlambat`,
      percentage: 100,
      barClass: "bg-error-500",
      detailClass: "text-error-600 dark:text-error-400",
    };
  }
  if (difference <= 60 * 60 * 1000) {
    return {
      label: ticket.sla ? `SLA ${ticket.sla} jam` : "SLA",
      detail: `${remaining} lagi`,
      percentage,
      barClass: "bg-warning-500",
      detailClass: "text-warning-700 dark:text-warning-400",
    };
  }
  return {
    label: ticket.sla ? `SLA ${ticket.sla} jam` : "SLA",
    detail: `${remaining} lagi`,
    percentage,
    barClass: "bg-success-500",
    detailClass: "text-gray-400",
  };
}
export default function AdminTicketTable() {
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [picFilter, setPicFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<TicketView | null>(null);
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [
    editingTicket,
    setEditingTicket,
  ] = useState<TicketView | null>(
    null
  );
  const loadTickets = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const result = await getTickets();
      setTickets(result as TicketView[]);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Gagal mengambil data ticket.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadTickets(true);
    const intervalId = window.setInterval(() => void loadTickets(false), REFRESH_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, [loadTickets]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, priorityFilter, unitFilter, categoryFilter, picFilter]);
  const statistics = useMemo(() => ({
    total: tickets.length,
    masuk: tickets.filter((ticket) => normalizeStatus(ticket.status) === "MASUK").length,
    open: tickets.filter((ticket) => normalizeStatus(ticket.status) === "OPEN").length,
    ongoing: tickets.filter((ticket) => normalizeStatus(ticket.status) === "ON_GOING").length,
    pending: tickets.filter((ticket) => normalizeStatus(ticket.status) === "PENDING").length,
    completed: tickets.filter((ticket) => normalizeStatus(ticket.status) === "COMPLETED").length,
  }), [tickets]);
  const unitOptions = useMemo(() => {
    const units = new Set(
      tickets
        .map((ticket) => getReporterEmployee(ticket)?.unitKerja?.trim())
        .filter((value): value is string => Boolean(value))
    );

    UNIT_KERJA_OPTIONS.forEach((unit) => units.add(unit));

    return Array.from(units).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [tickets]);
  const picOptions = useMemo(() => Array.from(new Set(
    tickets.map((ticket) => ticket.handlerId ? getHandlerName(ticket) : null).filter((value): value is string => Boolean(value))
  )).sort((a, b) => a.localeCompare(b, "id-ID")), [tickets]);
  const filteredTickets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...tickets]
      .filter((ticket) => {
        const employee = getReporterEmployee(ticket);
        const handlerName = getHandlerName(ticket);
        const priority = resolveTicketPriority(ticket);
        const searchableText = [
          ticket.noPelaporan,
          ticket.keluhan,
          ticket.kategoriKeluhan,
          employee?.nik,
          employee?.nama,
          employee?.jabatan,
          employee?.unitKerja,
          handlerName,
          getStatusLabel(ticket.status),
          getPriorityLevel(priority),
        ].filter(Boolean).join(" ").toLowerCase();
        return (
          (!keyword || searchableText.includes(keyword)) &&
          (statusFilter === "ALL" || normalizeStatus(ticket.status) === statusFilter) &&
          (priorityFilter === "ALL" || Number(priorityFilter) === priority) &&
          (unitFilter === "ALL" || employee?.unitKerja?.trim() === unitFilter) &&
          (categoryFilter === "ALL" || ticket.kategoriKeluhan === categoryFilter) &&
          (picFilter === "ALL" || (picFilter === "UNASSIGNED" ? !ticket.handlerId : handlerName === picFilter))
        );
      })
      .sort((a, b) => {
        // Urutan utama: priority 1, 2, 3, lalu 4 (dihitung dari jabatan pelapor).
        const priorityA = resolveTicketPriority(a) || 99;
        const priorityB = resolveTicketPriority(b) || 99;
        const priorityDifference = priorityA - priorityB;
        if (priorityDifference !== 0) {
          return priorityDifference;
        }
        // Jika priority sama, ticket yang masuk lebih dahulu ditampilkan lebih atas.
        const dateA = new Date(a.waktuKeluhan || a.createdAt || 0).getTime();
        const dateB = new Date(b.waktuKeluhan || b.createdAt || 0).getTime();
        return dateA - dateB;
      });
  }, [tickets, search, statusFilter, priorityFilter, unitFilter, categoryFilter, picFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTickets = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredTickets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTickets, safeCurrentPage]);
  const firstShown = filteredTickets.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastShown = Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredTickets.length);
  function resetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setUnitFilter("ALL");
    setCategoryFilter("ALL");
    setPicFilter("ALL");
  }
  return (
    <>
      <div className="min-w-0 space-y-4 pb-6">
        <PageHeader />
        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-error-200 bg-error-50 px-5 py-4 dark:border-error-500/30 dark:bg-error-500/10">
            <p className="text-theme-sm font-medium text-error-700 dark:text-error-400">{error}</p>
            <button type="button" onClick={() => void loadTickets(true)} className="text-theme-sm font-semibold text-error-700 underline dark:text-error-400">Coba lagi</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatisticCard label="Total Ticket" value={statistics.total} description="Seluruh ticket" color="blue" icon={<DocumentIcon />} />
          <StatisticCard label="Masuk" value={statistics.masuk} description="Belum ditugaskan" color="gray" icon={<InboxIcon />} />
          <StatisticCard label="Open" value={statistics.open} description="Sudah ditugaskan" color="blue" icon={<OpenIcon />} />
          <StatisticCard label="On Going" value={statistics.ongoing} description="Sedang dikerjakan" color="purple" icon={<ProcessIcon />} />
          <StatisticCard label="Pending" value={statistics.pending} description="Ditunda sementara" color="orange" icon={<PauseIcon />} />
          <StatisticCard label="Completed" value={statistics.completed} description="Pengerjaan selesai" color="green" icon={<CheckIcon />} />
        </div>
        <section className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <FilterSelect value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)}>
              <option value="ALL">Semua Status</option>
              <option value="MASUK">Masuk</option>
              <option value="OPEN">Open</option>
              <option value="ON_GOING">On Going</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
            </FilterSelect>
            <FilterSelect value={priorityFilter} onChange={(value) => setPriorityFilter(value as PriorityFilter)}>
              <option value="ALL">Semua Priority</option>
              <option value="1">Direksi</option>
              <option value="2">VP/EVP</option>
              <option value="3">Manager</option>
              <option value="4">Staff</option>
            </FilterSelect>
            <SearchableSelect
              value={unitFilter}
              onChange={setUnitFilter}
              options={unitOptions}
              placeholder="Cari unit kerja..."
              allLabel="Semua Unit Kerja"
            />
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter}>
              <option value="ALL">Semua Kategori</option>
              {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
            </FilterSelect>
            <FilterSelect value={picFilter} onChange={setPicFilter}>
              <option value="ALL">Semua PIC</option>
              <option value="UNASSIGNED">Belum Ditugaskan</option>
              {picOptions.map((pic) => <option key={pic} value={pic}>{pic}</option>)}
            </FilterSelect>
          </div>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex w-fit rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
              <ViewButton active={viewMode === "LIST"} onClick={() => setViewMode("LIST")} icon={<ListIcon />}>List</ViewButton>
              <ViewButton active={viewMode === "KANBAN"} onClick={() => setViewMode("KANBAN")} icon={<KanbanIcon />}>Kanban</ViewButton>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="relative w-full sm:w-[300px] lg:w-[340px]">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari ticket, NIK, nama, keluhan, atau PIC..."
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
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
        </section>
        {loading ? (
          <LoadingState />
        ) : filteredTickets.length === 0 ? (
          <EmptyState hasTickets={tickets.length > 0} />
        ) : viewMode === "KANBAN" ? (
          <KanbanView
            tickets={paginatedTickets}
            onDetail={setSelectedTicket}
            onEdit={(ticket) => setEditingTicket(ticket)}
          />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedTickets.map((ticket) => (
                <TicketListRow
                  key={ticket.id}
                  ticket={ticket}
                  isActionOpen={openActionId === ticket.id}
                  onToggleAction={() =>
                    setOpenActionId((currentId) =>
                      currentId === ticket.id
                        ? null
                        : ticket.id
                    )
                  }
                  onCloseAction={() =>
                    setOpenActionId(null)
                  }
                  onDetail={() => {
                    setSelectedTicket(ticket);
                    setOpenActionId(null);
                  }}
                  onEdit={() => {
                    setEditingTicket(ticket);
                    setOpenActionId(null);
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">Menampilkan {firstShown}–{lastShown} dari {filteredTickets.length} ticket.</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className={paginationButtonClass}>Sebelumnya</button>
                {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-theme-xs font-semibold ${safeCurrentPage === page ? "bg-brand-500 text-white" : "border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"}`}
                  >
                    {page}
                  </button>
                ))}
                <button type="button" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className={paginationButtonClass}>Berikutnya</button>
              </div>
            </div>
          </section>
        )}
      </div>
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() =>
            setSelectedTicket(null)
          }
        />
      )}
      {editingTicket && (
        <EditTicketModal
          ticket={editingTicket}
          onClose={() =>
            setEditingTicket(null)
          }
          onSuccess={async () => {
            setEditingTicket(null);
            await loadTickets(false);
          }}
        />
      )}
    </>
  );
}
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
          <TicketBoardIllustration />
        </div>
      </div>
      {/* <div className="relative">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90 sm:text-[28px]">
          Manajemen Ticketing
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-theme-sm text-gray-500">
          <span className="font-medium text-gray-600 dark:text-gray-300">Ticketing</span>
          <ChevronRightIcon />
          <span>Semua Ticket</span>
        </div>
        <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
          Kelola pengaduan troubleshooting dan proses penanganannya.
        </p>
      </div> */}
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            Ticketing
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
            Manajemen Ticketing
          </h1>

          <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
            Kelola pengaduan troubleshooting dan proses penanganannya.
          </p>
        </div>
      </div>
    </section>
  );
}
function TicketListRow({
  ticket,
  isActionOpen,
  onToggleAction,
  onCloseAction,
  onDetail,
  onEdit,
}: {
  ticket: TicketView;
  isActionOpen: boolean;
  onToggleAction: () => void;
  onCloseAction: () => void;
  onDetail: () => void;
  onEdit: () => void;
}) {
  const employee =
    getReporterEmployee(ticket);
  const reporterName =
    getReporterName(ticket);
  const handlerName =
    getHandlerName(ticket);
  const priority =
    resolveTicketPriority(ticket);
  const sla =
    getSlaInformation(ticket);
  return (
    <article className="group relative px-4 py-3.5 transition hover:bg-brand-50/30 dark:hover:bg-brand-500/[0.03] sm:px-5">
      <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-brand-500" />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[150px_minmax(200px,1.4fr)_minmax(170px,1fr)_140px_135px_100px_38px] xl:items-center">
        {/* Nomor ticket */}
        <div>
          <button
            type="button"
            onClick={onDetail}
            className="block max-w-full text-left"
          >
            <span className="block break-all text-theme-sm font-bold leading-5 text-brand-600 hover:underline dark:text-brand-400">
              {ticket.noPelaporan || `TKT-${ticket.id}`}
            </span>
          </button>
          <p className="mt-1 text-theme-xs text-gray-400">
            {formatDateTime(
              ticket.waktuKeluhan
            )}
          </p>
        </div>
        {/* Keluhan */}
        <div className="min-w-0 border-gray-100 xl:border-l xl:pl-4 dark:border-gray-800">
          <p className="line-clamp-1 text-theme-sm font-bold text-gray-800 dark:text-white/90">
            {ticket.keluhan ||
              "Keluhan tidak tersedia"}
          </p>
          <p className="mt-1 line-clamp-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {ticket.keteranganResponse ||
              "Belum ada keterangan response."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <CategoryBadge
              category={
                ticket.kategoriKeluhan
              }
            />
          </div>
        </div>
        {/* Pelapor */}
        <div className="flex min-w-0 items-center gap-3 border-gray-100 xl:border-l xl:pl-4 dark:border-gray-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {getInitial(
              reporterName
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {reporterName}
            </p>
            <p className="mt-0.5 truncate text-theme-xs text-gray-500">
              {employee?.nik || "-"}
            </p>
            <p className="mt-0.5 truncate text-theme-xs text-gray-400">
              {employee?.unitKerja ||
                "-"}
            </p>
          </div>
        </div>
        {/* Priority dan SLA */}
        <div className="border-gray-100 xl:border-l xl:pl-4 dark:border-gray-800">
          <PriorityBadge
            priority={priority}
          />
          <p className="mt-2 text-theme-xs text-gray-500">
            {sla.label}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`h-full rounded-full ${sla.barClass}`}
              style={{
                width: `${sla.percentage}%`,
              }}
            />
          </div>
          <p
            className={`mt-1 text-[11px] ${sla.detailClass}`}
          >
            {sla.detail}
          </p>
        </div>
        {/* PIC */}
        <div className="flex min-w-0 items-center gap-3 border-gray-100 xl:border-l xl:pl-4 dark:border-gray-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {getInitial(
              handlerName
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {handlerName}
            </p>
            <p className="mt-0.5 truncate text-theme-xs text-gray-400">
              {ticket.handler
                ?.employee
                ?.jobTitle ||
                (ticket.handlerId
                  ? "Staff IT"
                  : "Belum ada PIC")}
            </p>
          </div>
        </div>
        {/* Status */}
        <div className="border-gray-100 xl:border-l xl:pl-4 dark:border-gray-800">
          <StatusBadge
            status={ticket.status}
          />
        </div>
        {/* Menu aksi */}
        <div className="relative flex justify-end">
          <button
            type="button"
            aria-label="Buka menu aksi"
            onClick={(event) => {
              event.stopPropagation();
              onToggleAction();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-theme-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            <DotsIcon />
          </button>
          {isActionOpen && (
            <>
              <button
                type="button"
                aria-label="Tutup menu aksi"
                onClick={
                  onCloseAction
                }
                className="fixed inset-0 z-[90] cursor-default"
              />
              <div className="absolute right-0 top-11 z-[100] w-48 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
                <button
                  type="button"
                  onClick={onDetail}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-theme-sm font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                >
                  <EyeIcon />
                  <span>
                    Lihat Detail
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-theme-sm font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                >
                  <EditIcon />
                  <span>
                    Edit Ticket
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
function KanbanView({
  tickets,
  onDetail,
  onEdit,
}: {
  tickets: TicketView[];
  onDetail: (ticket: TicketView) => void;
  onEdit: (ticket: TicketView) => void;
}) {
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const columns = ["MASUK", "OPEN", "ON_GOING", "PENDING", "COMPLETED"];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {columns.map((status) => {
        const items = tickets.filter((ticket) => normalizeStatus(ticket.status) === status);
        return (
          <section key={status} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-2.5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between px-1 py-2">
              <StatusBadge status={status} />
              <span className="text-theme-xs font-semibold text-gray-400">{items.length}</span>
            </div>
            <div className="mt-2 space-y-3">
              {items.map((ticket) => (
                <div
                  key={ticket.id}
                  className="relative rounded-xl border border-gray-200 bg-gray-50 p-2.5 transition hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() => onDetail(ticket)}
                    className="block w-full text-left"
                  >
                    <p className="break-all pr-6 text-[10px] font-semibold text-brand-600">{ticket.noPelaporan}</p>
                    <p className="mt-2 line-clamp-2 pr-6 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{ticket.keluhan}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <PriorityBadge priority={resolveTicketPriority(ticket)} compact />
                      <span className="text-[11px] text-gray-400">{formatDateTime(ticket.waktuKeluhan)}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label="Buka menu aksi"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenActionId((currentId) => (currentId === ticket.id ? null : ticket.id));
                    }}
                    className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-white hover:text-brand-600 dark:hover:bg-gray-800"
                  >
                    <DotsIcon />
                  </button>

                  {openActionId === ticket.id && (
                    <>
                      <button
                        type="button"
                        aria-label="Tutup menu aksi"
                        onClick={() => setOpenActionId(null)}
                        className="fixed inset-0 z-[90] cursor-default"
                      />
                      <div className="absolute right-1.5 top-9 z-[100] w-40 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
                        <button
                          type="button"
                          onClick={() => {
                            onDetail(ticket);
                            setOpenActionId(null);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-theme-xs font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                        >
                          <EyeIcon />
                          <span>Lihat Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onEdit(ticket);
                            setOpenActionId(null);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-theme-xs font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                        >
                          <EditIcon />
                          <span>Edit Ticket</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {items.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-theme-xs text-gray-400 dark:border-gray-700">Tidak ada ticket</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
function FilterSelect({ value, onChange, children, extraClass = "" }: { value: string; onChange: (value: string) => void; children: React.ReactNode; extraClass?: string }) {
  return (
    <div className={`relative ${extraClass}`}>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-10 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        {children}
      </select>
      <SelectArrow />
    </div>
  );
}
function ViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-theme-sm font-semibold transition ${active ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-800 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}>
      {icon}{children}
    </button>
  );
}
function CategoryBadge({ category }: { category?: string | null }) {
  return <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{category || "Kategori belum ditentukan"}</span>;
}
function StatisticCard({ label, value, description, color, icon }: { label: string; value: number; description: string; color: StatisticColor; icon: React.ReactNode }) {
  const styles: Record<StatisticColor, { icon: string; value: string }> = {
    blue: { icon: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400", value: "text-brand-600 dark:text-brand-400" },
    gray: { icon: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", value: "text-gray-800 dark:text-white/90" },
    purple: { icon: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400", value: "text-purple-600 dark:text-purple-400" },
    orange: { icon: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400", value: "text-warning-700 dark:text-warning-400" },
    green: { icon: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400", value: "text-success-700 dark:text-success-400" },
  };
  const currentStyle = styles[color];
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${currentStyle.icon}`}>{icon}</div>
      <p className="mt-3 truncate text-theme-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`text-xl font-bold ${currentStyle.value}`}>{value}</p>
        <span className="text-right text-theme-xs text-gray-400">{description}</span>
      </div>
    </div>
  );
}
function PriorityBadge({ priority, compact = false }: { priority?: number; compact?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-theme-xs"} font-semibold ${getPriorityClass(priority)}`}>
        <PriorityIcon />{getPriorityLevel(priority)}
      </span>
      {/* {!compact && <span className="pl-1 text-[11px] text-gray-400">{getPrioritySource(priority)}</span>} */}
    </div>
  );
}
function StatusBadge({ status }: { status?: string }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getStatusClass(status)}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{getStatusLabel(status)}</span>;
}
const paginationButtonClass = "inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-theme-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";
function LoadingState() {
  return <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" /><p className="text-theme-sm text-gray-500">Memuat data ticket...</p></div>;
}
function EmptyState({ hasTickets }: { hasTickets: boolean }) {
  return <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500"><DocumentIcon /></div><h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">Ticket tidak ditemukan</h3><p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500">{hasTickets ? "Tidak ada ticket yang sesuai dengan pencarian atau filter yang dipilih." : "Belum ada ticket yang tersimpan pada sistem."}</p></div>;
}
function SelectArrow() { return <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function SearchIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>; }
function PlusIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" d="M12 5.25v13.5M18.75 12H5.25" /></svg>; }
function FilterIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5l-6.375 7.125v5.625l-3.75 2.25v-7.875L3.75 4.5Z" /></svg>; }
function ListIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" d="M8.25 6.75h11.25M8.25 12h11.25M8.25 17.25h11.25" /><circle cx="4.5" cy="6.75" r=".75" fill="currentColor" /><circle cx="4.5" cy="12" r=".75" fill="currentColor" /><circle cx="4.5" cy="17.25" r=".75" fill="currentColor" /></svg>; }
function KanbanIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4"><rect x="4" y="5" width="6" height="14" rx="1.5" /><rect x="14" y="5" width="6" height="9" rx="1.5" /></svg>; }
function DotsIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>; }
function PriorityIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12V16.5ZM4.5 19.5h15L12 4.5l-7.5 15Z" /></svg>; }
function DocumentIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H6.375A1.125 1.125 0 0 0 5.25 3.375v17.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V6.75L13.5 2.25Z" /></svg>; }
function InboxIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 6.75 4.5h10.5l2.25 8.25m-15 0v5.625A1.875 1.875 0 0 0 6.375 20.25h11.25a1.875 1.875 0 0 0 1.875-1.875V12.75h-4.125a3.375 3.375 0 0 1-6.75 0H4.5Z" /></svg>; }
function OpenIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" /></svg>; }
function ProcessIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 12.804-5.304L19.5 9m0 0V4.5M19.5 9H15m4.5 3a7.5 7.5 0 0 1-12.804 5.304L4.5 15m0 0v4.5M4.5 15H9" /></svg>; }
function PauseIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M9.5 8.5v7M14.5 8.5v7" /></svg>; }
function CheckIcon() { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12 2.25 2.25 4.75-5" /></svg>; }
function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4.5 9A8 8 0 1 1 5 16" strokeLinecap="round" />
      <path d="M4 4.5V9h4.5" strokeLinecap="round" strokeLinejoin="round" />
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
function TicketBoardIllustration() {
  return (
    <svg viewBox="0 0 140 120" className="h-20 w-24" fill="none">
      <rect x="18" y="24" width="30" height="72" rx="6" fill="currentColor" opacity="0.15" />
      <rect x="55" y="14" width="30" height="82" rx="6" fill="currentColor" opacity="0.28" />
      <rect x="92" y="34" width="30" height="62" rx="6" fill="currentColor" opacity="0.45" />
      <rect x="60" y="24" width="20" height="6" rx="3" fill="white" />
      <rect x="60" y="36" width="20" height="6" rx="3" fill="white" />
      <rect x="97" y="44" width="20" height="6" rx="3" fill="white" />
    </svg>
  );
}
function EyeIcon() {
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
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
      />
      <circle
        cx="12"
        cy="12"
        r="2.75"
      />
    </svg>
  );
}
function EditIcon() {
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
        d="m16.862 4.487 2.651 2.651M18.75 2.625a1.875 1.875 0 0 1 2.652 2.652L8.25 18.429 3 19.5l1.071-5.25L18.75 2.625Z"
      />
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