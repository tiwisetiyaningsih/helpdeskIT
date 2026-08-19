"use client";

import { useState } from "react";
import type { Ticket } from "@/services/ticket.service";
import EvidenceImage from "../tickets/EvidenceImage";
import { apiFetch } from "@/lib/apiFetch";

type TicketDetailProps = {
  ticket: Ticket | null;
  onClose: () => void;
};

type TimelineStatus =
  | "MASUK"
  | "OPEN"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED";

type TimelineItem = {
  status: TimelineStatus;
  label: string;
  date: string | null;
};

function normalizeStatus(status?: string) {
  return String(status || "MASUK")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");
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

async function downloadEvidence(
  fileUrl: string,
  fileName: string
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  if (!token) {
    alert(
      "Sesi login tidak ditemukan. Silakan login kembali."
    );
    return;
  }

  try {
    const response = await apiFetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        "Gagal mengunduh evidence."
      );
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error("DOWNLOAD EVIDENCE ERROR:", error);
    alert("Gagal mengunduh evidence.");
  }
}

function formatFileSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(
  value?: string | number | null,
  unit = "menit"
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "-";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return `${numberValue} ${unit}`;
}

function formatSla(value?: string | number | null) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Belum ditentukan";
  }

  return `SLA ${value} jam`;
}

function getPriorityLabel(priority?: number | null) {
  const labels: Record<number, string> = {
    1: "Sangat Tinggi",
    2: "Tinggi",
    3: "Sedang",
    4: "Rendah",
  };

  return labels[priority || 0] || "Belum ditentukan";
}

function getPrioritySource(priority?: number | null) {
  const sources: Record<number, string> = {
    1: "Direksi",
    2: "VP/EVP",
    3: "Manager",
    4: "Staff",
  };

  return sources[priority || 0] || "-";
}

function getPriorityClass(priority?: number | null) {
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

function getStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    MASUK: "Masuk",
    OPEN: "Open",
    ON_GOING: "On Going",
    PENDING: "Pending",
    COMPLETED: "Completed",
    CANCELLED: "Dibatalkan",
  };

  const normalized = normalizeStatus(status);
  return labels[normalized] || status || "-";
}

function getStatusDescription(status?: string) {
  const descriptions: Record<string, string> = {
    MASUK: "Ticket baru dan sedang menunggu penugasan admin.",
    OPEN: "Ticket sudah ditugaskan kepada IT HelpDesk.",
    ON_GOING: "Ticket sedang dikerjakan oleh IT HelpDesk.",
    PENDING: "Pengerjaan ticket sedang ditunda sementara.",
    COMPLETED: "Ticket telah selesai ditangani.",
    CANCELLED: "Ticket telah dibatalkan.",
  };

  return (
    descriptions[normalizeStatus(status)] ||
    "Status ticket tidak diketahui."
  );
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
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getReporterEmployee(ticket: Ticket) {
  return ticket.reporter?.employee || ticket.employee || null;
}

function getReporterName(ticket: Ticket) {
  return (
    getReporterEmployee(ticket)?.nama ||
    ticket.reporter?.email ||
    "Data pelapor tidak tersedia"
  );
}

function getHandlerName(ticket: Ticket) {
  return (
    ticket.handler?.employee?.nama ||
    ticket.handler?.email ||
    "Belum ditugaskan"
  );
}

function getInitial(name?: string) {
  return (
    String(name || "?")
      .trim()
      .charAt(0)
      .toUpperCase() || "?"
  );
}

function getStatusLevel(status?: string) {
  const levels: Record<string, number> = {
    MASUK: 1,
    OPEN: 2,
    ON_GOING: 3,
    PENDING: 4,
    COMPLETED: 5,
  };

  return levels[normalizeStatus(status)] || 0;
}

function getTimeline(ticket: Ticket): TimelineItem[] {
  const normalized = normalizeStatus(ticket.status);

  return [
    {
      status: "MASUK",
      label: "Masuk",
      date: ticket.waktuKeluhan || ticket.createdAt || null,
    },
    {
      status: "OPEN",
      label: "Open",
      date:
        getStatusLevel(normalized) >= 2
          ? ticket.updatedAt || null
          : null,
    },
    {
      status: "ON_GOING",
      label: "On Going",
      date: ticket.mulaiPengerjaan || null,
    },
    {
      status: "PENDING",
      label: "Pending",
      date:
        normalized === "PENDING"
          ? ticket.updatedAt || null
          : null,
    },
    {
      status: "COMPLETED",
      label: "Completed",
      date: ticket.selesaiPengerjaan || null,
    },
  ];
}

function getSlaProgress(ticket: Ticket) {
  if (normalizeStatus(ticket.status) === "COMPLETED") {
    return {
      percentage: 100,
      description: "Selesai",
      barClass: "bg-success-500",
      textClass: "text-success-600 dark:text-success-400",
    };
  }

  if (!ticket.batasResponse || !ticket.waktuKeluhan) {
    return {
      percentage: 0,
      description: "Batas response belum tersedia",
      barClass: "bg-gray-300 dark:bg-gray-700",
      textClass: "text-gray-400",
    };
  }

  const start = new Date(ticket.waktuKeluhan).getTime();
  const deadline = new Date(ticket.batasResponse).getTime();

  if (Number.isNaN(start) || Number.isNaN(deadline)) {
    return {
      percentage: 0,
      description: "Data SLA tidak valid",
      barClass: "bg-gray-300 dark:bg-gray-700",
      textClass: "text-gray-400",
    };
  }

  const now = Date.now();
  const totalDuration = Math.max(deadline - start, 1);
  const elapsed = Math.max(now - start, 0);
  const percentage = Math.min(
    100,
    Math.max(4, (elapsed / totalDuration) * 100)
  );

  const remainingMilliseconds = deadline - now;
  const absoluteMinutes = Math.ceil(
    Math.abs(remainingMilliseconds) / 60000
  );

  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  const remainingText = `${hours > 0 ? `${hours} jam ` : ""
    }${minutes} menit`;

  if (remainingMilliseconds < 0) {
    return {
      percentage: 100,
      description: `${remainingText} terlambat`,
      barClass: "bg-error-500",
      textClass: "text-error-600 dark:text-error-400",
    };
  }

  if (remainingMilliseconds <= 60 * 60 * 1000) {
    return {
      percentage,
      description: `${remainingText} tersisa`,
      barClass: "bg-warning-500",
      textClass: "text-warning-700 dark:text-warning-400",
    };
  }

  return {
    percentage,
    description: `${remainingText} tersisa`,
    barClass: "bg-success-500",
    textClass: "text-gray-500",
  };
}

export default function TicketDetail({
  ticket,
  onClose,
}: TicketDetailProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!ticket) return null;

  const employee = getReporterEmployee(ticket);
  const reporterName = getReporterName(ticket);
  const handlerName = getHandlerName(ticket);
  const timeline = getTimeline(ticket);
  const currentLevel = getStatusLevel(ticket.status);
  const slaProgress = getSlaProgress(ticket);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Detail Ticket
              </h2>

              <StatusBadge status={ticket.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="break-all text-theme-sm font-semibold text-brand-600 dark:text-brand-400">
                {ticket.noPelaporan}
              </p>

              <button
                type="button"
                title="Salin nomor ticket"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    ticket.noPelaporan
                  );
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-500 transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
              >
                <CopyIcon />
              </button>
            </div>

            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              {getStatusDescription(ticket.status)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 sm:p-6">
            <section className="overflow-x-auto">
              <div className="flex min-w-[760px] items-start">
                {timeline.map((item, index) => {
                  const itemLevel = index + 1;
                  const isCompleted = currentLevel > itemLevel;
                  const isCurrent = currentLevel === itemLevel;

                  return (
                    <div
                      key={item.status}
                      className="flex flex-1 items-start"
                    >
                      <div className="flex min-w-[115px] flex-col items-center text-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${isCompleted
                              ? "border-success-500 bg-success-50 text-success-600 dark:bg-success-500/10"
                              : isCurrent
                                ? "border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-500/10"
                                : "border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800"
                            }`}
                        >
                          {isCompleted ? (
                            <CheckSmallIcon />
                          ) : item.status === "PENDING" ? (
                            <PauseSmallIcon />
                          ) : item.status === "ON_GOING" ? (
                            <ProcessSmallIcon />
                          ) : (
                            <CheckSmallIcon />
                          )}
                        </div>

                        <p className="mt-2 text-theme-xs font-bold text-gray-700 dark:text-gray-300">
                          {item.label}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-400">
                          {formatDateTime(item.date)}
                        </p>
                      </div>

                      {index < timeline.length - 1 && (
                        <div className="mt-[18px] h-px flex-1 bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full ${currentLevel > itemLevel
                                ? "bg-success-400"
                                : "bg-gray-200 dark:bg-gray-700"
                              }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <DetailSection
              title="Informasi Pelaporan"
              icon={<UserIcon />}
              iconClass="bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
            >
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-theme-xs font-bold text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                    {getInitial(reporterName)}
                  </div>

                  <DetailValue
                    label="Pelapor"
                    value={reporterName}
                    secondary={employee?.nik || "-"}
                  />
                </div>

                <DetailValue
                  label="Jabatan"
                  value={employee?.jabatan || "-"}
                />

                <DetailValue
                  label="Unit Kerja"
                  value={employee?.unitKerja || "-"}
                />

                <DetailValue
                  label="Email"
                  value={ticket.reporter?.email || "-"}
                />

                <DetailValue
                  label="Waktu Keluhan"
                  value={formatDateTime(ticket.waktuKeluhan)}
                  icon={<CalendarIcon />}
                />

                <DetailValue
                  label="Job Title"
                  value={employee?.jobTitle || "-"}
                />

                <DetailValue
                  label="NIK"
                  value={employee?.nik || "-"}
                />

                <DetailValue
                  label="Nomor Pelaporan"
                  value={ticket.noPelaporan}
                />
              </div>
            </DetailSection>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DetailSection
                title="Keluhan"
                icon={<DocumentIcon />}
                iconClass="bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
              >
                <p className="whitespace-pre-wrap break-words text-theme-sm font-medium leading-6 text-gray-800 dark:text-gray-200">
                  {ticket.keluhan || "Keluhan tidak tersedia."}
                </p>
              </DetailSection>

              <DetailSection
                title="Kategori & Priority"
                icon={<FolderIcon />}
                iconClass="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailValue
                    label="Kategori Keluhan"
                    value={
                      ticket.kategoriKeluhan ||
                      "Belum ditentukan"
                    }
                    badgeClass="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  />

                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Priority
                    </p>

                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPriorityClass(
                          ticket.priority
                        )}`}
                      >
                        {getPriorityLabel(ticket.priority)} (
                        {getPrioritySource(ticket.priority)})
                      </span>
                    </div>

                    <p className="mt-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Sumber Priority
                    </p>

                    <p className="mt-1 text-theme-xs font-semibold text-gray-800 dark:text-gray-200">
                      {getPrioritySource(ticket.priority)}
                    </p>
                  </div>
                </div>
              </DetailSection>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DetailSection
                title="Informasi Penugasan"
                icon={<AssignmentIcon />}
                iconClass="bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                      {getInitial(handlerName)}
                    </div>

                    <DetailValue
                      label="PIC / Handler"
                      value={handlerName}
                      secondary={
                        ticket.handler?.employee?.jobTitle ||
                        (ticket.handlerId
                          ? "IT HelpDesk"
                          : "Belum ditugaskan")
                      }
                    />
                  </div>

                  <DetailValue
                    label="Batas Response (SLA)"
                    value={formatSla(ticket.sla)}
                    secondary={formatDateTime(
                      ticket.batasResponse
                    )}
                  />

                  <DetailValue
                    label="Eskalasi"
                    value={ticket.eskalasi || "-"}
                  />

                  <DetailValue
                    label="Estimasi Pengerjaan"
                    value={formatDateTime(
                      ticket.estimasiPengerjaan
                    )}
                  />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Progress SLA
                    </p>

                    <p className="text-theme-xs font-bold text-brand-600 dark:text-brand-400">
                      {Math.round(slaProgress.percentage)}%
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all ${slaProgress.barClass}`}
                      style={{
                        width: `${slaProgress.percentage}%`,
                      }}
                    />
                  </div>

                  <p
                    className={`mt-2 text-[11px] ${slaProgress.textClass}`}
                  >
                    {slaProgress.description}
                  </p>
                </div>
              </DetailSection>

              <DetailSection
                title="Informasi Pengerjaan"
                icon={<WorkIcon />}
                iconClass="bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
              >
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailValue
                    label="Mulai Pengerjaan"
                    value={formatDateTime(
                      ticket.mulaiPengerjaan
                    )}
                    icon={<CalendarIcon />}
                  />

                  <DetailValue
                    label="Estimasi"
                    value={formatDateTime(
                      ticket.estimasiPengerjaan
                    )}
                  />

                  <DetailValue
                    label="Selesai Pengerjaan"
                    value={formatDateTime(
                      ticket.selesaiPengerjaan
                    )}
                  />

                  <DetailValue
                    label="Status Pending"
                    value={ticket.isPending ? "Ya" : "Tidak"}
                    badgeClass={
                      ticket.isPending
                        ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }
                  />

                  <DetailValue
                    label="Lama Pending"
                    value={formatDuration(
                      ticket.lamaPending,
                      "menit"
                    )}
                  />

                  <DetailValue
                    label="Waktu Pengerjaan"
                    value={formatDuration(
                      ticket.waktuPengerjaan,
                      "menit"
                    )}
                  />

                  <DetailValue
                    label="Selesai Response"
                    value={ticket.selesaiResponse || "-"}
                  />

                  <DetailValue
                    label="Status"
                    value={getStatusLabel(ticket.status)}
                  />
                </div>
              </DetailSection>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DetailSection
                title="Informasi Response"
                icon={<ResponseIcon />}
                iconClass="bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailValue
                    label="Selesai Response"
                    value={ticket.selesaiResponse || "-"}
                  />

                  <DetailValue
                    label="Keterangan Response"
                    value={
                      ticket.keteranganResponse || "-"
                    }
                  />
                </div>
              </DetailSection>

              <DetailSection
                title="Evidence / Lampiran"
                icon={<AttachmentIcon />}
                iconClass="bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
              >
                {!ticket.evidences ||
                  ticket.evidences.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-theme-sm text-gray-400 dark:border-gray-700">
                    Tidak ada evidence.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ticket.evidences.map((evidence) => {
                      const isImage =
                        Boolean(
                          evidence.mimeType?.startsWith("image/")
                        ) && Boolean(evidence.fileUrl);

                      const fileName =
                        evidence.fileName || "Evidence";

                      return (
                        <div
                          key={evidence.id}
                          className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]"
                        >
                          {isImage ? (
                            <EvidenceImage
                              fileUrl={evidence.fileUrl!}
                              alt={fileName}
                              className="h-40 w-full cursor-pointer object-cover"
                              onClick={() =>
                                setPreviewImage(evidence.fileUrl!)
                              }
                            />
                          ) : (
                            <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-800">
                              <FileIcon />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-3 dark:border-gray-800">
                            <div className="min-w-0">
                              <p
                                className="truncate text-theme-xs font-semibold text-gray-800 dark:text-white/90"
                                title={fileName}
                              >
                                {fileName}
                              </p>

                              <p className="mt-1 text-[11px] text-gray-400">
                                {formatFileSize(evidence.fileSize)}
                                {evidence.mimeType
                                  ? ` · ${evidence.mimeType}`
                                  : ""}
                              </p>
                            </div>

                            {evidence.fileUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void downloadEvidence(
                                    evidence.fileUrl!,
                                    fileName
                                  )
                                }
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10"
                                title="Unduh evidence"
                              >
                                <DownloadIcon />
                              </button>
                            ) : (
                              <span className="shrink-0 text-[11px] text-gray-400">
                                Tidak tersedia
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DetailSection>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DetailSection
                title="Analisa Ticket"
                icon={<AnalysisIcon />}
                iconClass="bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
              >
                <div className="space-y-4">
                  <TextBlock
                    label="Analisa Awal"
                    value={ticket.analisaAwal}
                  />

                  <TextBlock
                    label="Hasil Analisa"
                    value={ticket.hasilAnalisa}
                  />
                </div>
              </DetailSection>

              <DetailSection
                title="Catatan Tambahan"
                icon={<NoteIcon />}
                iconClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <div className="space-y-4">
                  <TextBlock
                    label="Catatan"
                    value={ticket.catatan}
                  />

                  <TextBlock
                    label="Keterangan"
                    value={ticket.keterangan}
                  />
                </div>
              </DetailSection>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <MetadataItem
              icon={<CalendarIcon />}
              label="Dibuat pada"
              value={formatDateTime(ticket.createdAt)}
            />

            <MetadataItem
              icon={<RefreshIcon />}
              label="Terakhir diperbarui"
              value={formatDateTime(ticket.updatedAt)}
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Tutup
          </button>
        </footer>
      </div>
      {previewImage && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <EvidenceImage
            fileUrl={previewImage}
            alt="Preview evidence"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function DetailSection({
  title,
  icon,
  iconClass,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>

        <h3 className="text-theme-sm font-bold text-gray-800 dark:text-white/90">
          {title}
        </h3>
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

function DetailValue({
  label,
  value,
  secondary,
  icon,
  badgeClass,
}: {
  label: string;
  value: string;
  secondary?: string;
  icon?: React.ReactNode;
  badgeClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <div className="mt-1.5 flex items-start gap-2">
        {icon && (
          <span className="mt-0.5 shrink-0 text-gray-500">
            {icon}
          </span>
        )}

        <div className="min-w-0">
          {badgeClass ? (
            <span
              className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}
            >
              {value}
            </span>
          ) : (
            <p className="break-words text-theme-xs font-semibold leading-5 text-gray-800 dark:text-white/90">
              {value || "-"}
            </p>
          )}

          {secondary && (
            <p className="mt-0.5 break-words text-[11px] text-gray-400">
              {secondary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <div className="mt-2 min-h-14 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-theme-xs leading-5 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {value?.trim() || "-"}
      </div>
    </div>
  );
}

function MetadataItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500">{icon}</span>

      <div>
        <p className="text-[10px] text-gray-400">
          {label}
        </p>

        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getStatusClass(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {getStatusLabel(status)}
    </span>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="12" cy="8" r="3" />
      <path strokeLinecap="round" d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5h7l4 4V20H7V3.5Z" />
      <path d="M14 3.5V8h4" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M3.5 6.5h6l2 2h9v10h-17v-12Z" />
    </svg>
  );
}

function AssignmentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M9 7V5h6v2M4 12h16" />
    </svg>
  );
}

function ResponseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M5 5h14v11H9l-4 3V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

function AttachmentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" d="m9 12 5.5-5.5a3 3 0 0 1 4.25 4.25L11 18.5a5 5 0 0 1-7.07-7.07L12 3.36" />
    </svg>
  );
}

function AnalysisIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <circle cx="10" cy="10" r="5" />
      <path d="m14 14 5 5" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M6 4h12v16H6V4Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M7 3.5h7l4 4V20H7V3.5Z" />
      <path d="M14 3.5V8h4" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="8" y="8" width="10" height="10" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" d="M20 11a8 8 0 0 0-14-4l-2 2m0 0V4m0 5h5M4 13a8 8 0 0 0 14 4l2-2m0 0v5m0-5h-5" />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 12 3 3 7-7" />
    </svg>
  );
}

function PauseSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M9 7v10M15 7v10" />
    </svg>
  );
}

function ProcessSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}