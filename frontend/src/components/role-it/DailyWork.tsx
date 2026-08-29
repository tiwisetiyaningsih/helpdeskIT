"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Ticket } from "@/services/ticket.service";
import TicketDetail from "./TicketDetail";
import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/config";

const REFRESH_INTERVAL = 15_000;
const ITEMS_PER_PAGE = 10;


type WorkTab =
  | "ALL"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED_TODAY";

type PriorityFilter =
  | "ALL"
  | "1"
  | "2"
  | "3"
  | "4";

type SortMode =
  | "PRIORITY"
  | "DEADLINE"
  | "NEWEST"
  | "OLDEST";

type WorkAction =
  | "UPDATE"
  | "PENDING"
  | "RESUME"
  | "COMPLETED";

type CurrentUser = {
  id: number;
  email?: string;
  employee?: {
    nama?: string;
    nik?: string;
    jabatan?: string;
    unitKerja?: string;
    jobTitle?: string | null;
  } | null;
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

type MeResponse = {
  success?: boolean;
  message?: string;
  user?: CurrentUser;
  data?: CurrentUser;
};

type UpdateResponse = {
  success?: boolean;
  message?: string;
  ticket?: Ticket;
};

type WorkForm = {
  catatan: string;
  keterangan: string;
  lamaPending: string;
};

type IconActionTone =
  | "default"
  | "brand"
  | "warning"
  | "success";

function IconActionButton({
  title,
  tone,
  onClick,
  children,
}: {
  title: string;
  tone: IconActionTone;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const styles: Record<
    IconActionTone,
    string
  > = {
    default:
      "border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400",

    brand:
      "border-brand-100 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400",

    warning:
      "border-warning-100 bg-warning-50 text-warning-700 hover:bg-warning-100 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-400",

    success:
      "border-success-100 bg-success-50 text-success-700 hover:bg-success-100 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

const INITIAL_FORM: WorkForm = {
  catatan: "",
  keterangan: "",
  lamaPending: "",
};

async function parseJsonResponse<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get("content-type");

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
      "Backend tidak mengembalikan JSON."
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
) {
  return String(status || "")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");
}

function getEmployee(
  ticket: Ticket
) {
  return (
    ticket.reporter?.employee ||
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
    "Pengguna"
  );
}

function getInitial(
  name?: string
) {
  return (
    String(name || "")
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

function getPriorityLabel(
  priority?: number | null
) {
  const labels: Record<number, string> = {
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

function getPriorityClass(
  priority?: number | null
) {
  if (priority === 1) {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }

  if (priority === 2) {
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400";
  }

  if (priority === 3) {
    return "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
  }

  if (priority === 4) {
    return "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400";
  }

  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

function getStatusLabel(
  status?: string
) {
  const labels: Record<string, string> = {
    ON_GOING: "On Going",
    PENDING: "Pending",
    COMPLETED: "Completed",
  };

  const normalized =
    normalizeStatus(status);

  return (
    labels[normalized] ||
    status ||
    "-"
  );
}

function getStatusClass(
  status?: string
) {
  switch (
  normalizeStatus(status)
  ) {
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

function isToday(
  value?: string | null
) {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  const today =
    new Date();

  return (
    date.getFullYear() ===
    today.getFullYear() &&
    date.getMonth() ===
    today.getMonth() &&
    date.getDate() ===
    today.getDate()
  );
}

function getRemainingTime(
  value?: string | null
) {
  if (!value) {
    return {
      label:
        "Estimasi belum tersedia",
      className:
        "text-gray-400",
      state: "UNSET",
    };
  }

  const deadline =
    new Date(value).getTime();

  if (
    Number.isNaN(deadline)
  ) {
    return {
      label:
        "Tanggal tidak valid",
      className:
        "text-gray-400",
      state: "UNSET",
    };
  }

  const difference =
    deadline - Date.now();

  const absoluteMinutes =
    Math.ceil(
      Math.abs(
        difference
      ) / 60_000
    );

  const days =
    Math.floor(
      absoluteMinutes / 1440
    );

  const hours =
    Math.floor(
      (absoluteMinutes % 1440) /
      60
    );

  const minutes =
    absoluteMinutes % 60;

  const duration = [
    days > 0
      ? `${days} hari`
      : "",
    hours > 0
      ? `${hours} jam`
      : "",
    minutes > 0
      ? `${minutes} menit`
      : "",
  ]
    .filter(Boolean)
    .join(" ") || "0 menit";

  if (
    difference < 0
  ) {
    return {
      label:
        `Terlambat ${duration}`,
      className:
        "text-error-600 dark:text-error-400",
      state: "OVERDUE",
    };
  }

  if (
    difference <=
    2 *
    60 *
    60 *
    1000
  ) {
    return {
      label:
        `${duration} lagi`,
      className:
        "text-warning-700 dark:text-warning-400",
      state: "DUE_SOON",
    };
  }

  return {
    label:
      `${duration} lagi`,
    className:
      "text-success-600 dark:text-success-400",
    state: "SAFE",
  };
}

export default function DailyWorkManagement() {
  const [
    tickets,
    setTickets,
  ] =
    useState<Ticket[]>([]);

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<WorkTab>(
      "ALL"
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<PriorityFilter>(
      "ALL"
    );

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "PRIORITY"
    );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    detailTicket,
    setDetailTicket,
  ] =
    useState<Ticket | null>(
      null
    );

  const [
    workTicket,
    setWorkTicket,
  ] =
    useState<Ticket | null>(
      null
    );

  const [
    workAction,
    setWorkAction,
  ] =
    useState<WorkAction>(
      "UPDATE"
    );

  const [
    form,
    setForm,
  ] =
    useState<WorkForm>(
      INITIAL_FORM
    );

  const [
    formError,
    setFormError,
  ] = useState("");

  const [openActionMenu, setOpenActionMenu] =
    useState<number | null>(null);

  const loadData =
    useCallback(
      async (
        showLoading = false
      ) => {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          setError(
            "Sesi login tidak ditemukan."
          );
          setLoading(false);
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          const [
            ticketResponse,
            meResponse,
          ] = await Promise.all([
            apiFetch(
              `${API_URL}/tickets`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  Accept:
                    "application/json",
                },
                cache: "no-store",
              }
            ),
            apiFetch(
              `${API_URL}/auth/me`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  Accept:
                    "application/json",
                },
                cache: "no-store",
              }
            ),
          ]);

          const ticketData =
            await parseJsonResponse<TicketResponse>(
              ticketResponse
            );

          const meData =
            await parseJsonResponse<MeResponse>(
              meResponse
            );

          if (
            !ticketResponse.ok ||
            ticketData.success ===
            false
          ) {
            throw new Error(
              ticketData.message ||
              "Gagal mengambil data ticket."
            );
          }

          if (
            !meResponse.ok ||
            meData.success ===
            false
          ) {
            throw new Error(
              meData.message ||
              "Gagal mengambil pengguna login."
            );
          }

          const loggedInUser =
            meData.user ||
            meData.data;

          if (!loggedInUser) {
            throw new Error(
              "Data pengguna login tidak ditemukan."
            );
          }

          setTickets(
            extractTickets(
              ticketData
            )
          );

          setCurrentUser(
            loggedInUser
          );
        } catch (
        loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Gagal memuat Daily Work."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    function closeMenu() {
      setOpenActionMenu(null);
    }

    window.addEventListener(
      "click",
      closeMenu
    );

    return () => {
      window.removeEventListener(
        "click",
        closeMenu
      );
    };
  }, []);

  useEffect(() => {
    void loadData(true);

    const intervalId =
      window.setInterval(
        () => {
          void loadData(false);
        },
        REFRESH_INTERVAL
      );

    return () =>
      window.clearInterval(
        intervalId
      );
  }, [loadData]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () =>
          setSuccess(""),
        3000
      );

    return () =>
      window.clearTimeout(
        timeoutId
      );
  }, [success]);

  const myWorkTickets =
    useMemo(() => {
      if (!currentUser) {
        return [];
      }

      return tickets.filter(
        (ticket) => {
          const status =
            normalizeStatus(
              ticket.status
            );

          return (
            ticket.handlerId ===
            currentUser.id &&
            (status ===
              "ON_GOING" ||
              status ===
              "PENDING" ||
              (status ===
                "COMPLETED" &&
                isToday(
                  ticket.selesaiPengerjaan ||
                  ticket.updatedAt
                )))
          );
        }
      );
    }, [
      tickets,
      currentUser,
    ]);

  const statistics =
    useMemo(() => {
      const ongoing =
        myWorkTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) === "ON_GOING"
        ).length;

      const pending =
        myWorkTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) === "PENDING"
        ).length;

      const completedToday =
        myWorkTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) ===
            "COMPLETED"
        ).length;

      const overdue =
        myWorkTickets.filter(
          (ticket) =>
            normalizeStatus(
              ticket.status
            ) !==
            "COMPLETED" &&
            getRemainingTime(
              ticket.estimasiPengerjaan
            ).state ===
            "OVERDUE"
        ).length;

      return {
        total:
          ongoing +
          pending,
        ongoing,
        pending,
        completedToday,
        overdue,
      };
    }, [myWorkTickets]);

  const filteredTickets =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return [
        ...myWorkTickets,
      ]
        .filter(
          (ticket) => {
            const status =
              normalizeStatus(
                ticket.status
              );

            const matchesTab =
              activeTab ===
                "ALL"
                ? status ===
                "ON_GOING" ||
                status ===
                "PENDING"
                : activeTab ===
                  "COMPLETED_TODAY"
                  ? status ===
                  "COMPLETED"
                  : status ===
                  activeTab;

            const employee =
              getEmployee(
                ticket
              );

            const searchableText =
              [
                ticket.noPelaporan,
                ticket.keluhan,
                ticket.kategoriKeluhan ||
                "",
                ticket.analisaAwal ||
                "",
                ticket.hasilAnalisa ||
                "",
                ticket.catatan ||
                "",
                employee?.nama ||
                "",
                employee?.nik ||
                "",
                employee?.jabatan ||
                "",
                employee?.unitKerja ||
                "",
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

            const matchesPriority =
              priorityFilter ===
              "ALL" ||
              ticket.priority ===
              Number(
                priorityFilter
              );

            return (
              matchesTab &&
              matchesSearch &&
              matchesPriority
            );
          }
        )
        .sort(
          (
            ticketA,
            ticketB
          ) => {
            const dateA =
              new Date(
                ticketA.updatedAt ||
                ticketA.waktuKeluhan ||
                0
              ).getTime();

            const dateB =
              new Date(
                ticketB.updatedAt ||
                ticketB.waktuKeluhan ||
                0
              ).getTime();

            if (
              sortMode ===
              "NEWEST"
            ) {
              return (
                dateB - dateA
              );
            }

            if (
              sortMode ===
              "OLDEST"
            ) {
              return (
                dateA - dateB
              );
            }

            if (
              sortMode ===
              "DEADLINE"
            ) {
              const deadlineA =
                ticketA.estimasiPengerjaan
                  ? new Date(
                    ticketA.estimasiPengerjaan
                  ).getTime()
                  : Number.MAX_SAFE_INTEGER;

              const deadlineB =
                ticketB.estimasiPengerjaan
                  ? new Date(
                    ticketB.estimasiPengerjaan
                  ).getTime()
                  : Number.MAX_SAFE_INTEGER;

              return (
                deadlineA -
                deadlineB
              );
            }

            const priorityDifference =
              (ticketA.priority ||
                99) -
              (ticketB.priority ||
                99);

            if (
              priorityDifference !==
              0
            ) {
              return priorityDifference;
            }

            return dateA - dateB;
          }
        );
    }, [
      myWorkTickets,
      activeTab,
      search,
      priorityFilter,
      sortMode,
    ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    search,
    priorityFilter,
    sortMode,
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

  function openWorkModal(
    ticket: Ticket,
    action: WorkAction
  ) {
    setWorkTicket(ticket);
    setWorkAction(action);

    setForm({
      catatan:
        ticket.catatan || "",
      keterangan:
        ticket.keterangan || "",
      lamaPending:
        ticket.lamaPending
          ? String(
            ticket.lamaPending
          )
          : "",
    });

    setFormError("");
  }

  function closeWorkModal() {
    if (saving) {
      return;
    }

    setWorkTicket(null);
    setWorkAction("UPDATE");
    setForm(INITIAL_FORM);
    setFormError("");
  }

  async function submitWork(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!workTicket) {
      return;
    }

    const catatan =
      form.catatan.trim();

    const keterangan =
      form.keterangan.trim();

    if (
      workAction !== "RESUME" &&
      !catatan
    ) {
      setFormError(
        "Catatan pengerjaan wajib diisi."
      );
      return;
    }

    if (
      workAction === "COMPLETED" &&
      !keterangan
    ) {
      setFormError(
        "Hasil pengerjaan wajib diisi."
      );
      return;
    }

    const lamaPending =
      Number(form.lamaPending);

    if (
      workAction === "PENDING" &&
      (
        !Number.isInteger(
          lamaPending
        ) ||
        lamaPending <= 0
      )
    ) {
      setFormError(
        "Lama pending harus berupa menit lebih dari 0."
      );
      return;
    }

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {
      setFormError(
        "Sesi login tidak ditemukan."
      );
      return;
    }

    const now =
      new Date();

    const nowIso =
      now.toISOString();

    const mulaiPengerjaan =
      workTicket.mulaiPengerjaan ||
      nowIso;

    let waktuPengerjaan:
      | number
      | null = null;

    if (
      workAction === "COMPLETED"
    ) {
      const mulai =
        new Date(
          mulaiPengerjaan
        ).getTime();

      if (
        !Number.isNaN(mulai)
      ) {
        const totalMinutes =
          Math.max(
            0,
            Math.floor(
              (
                now.getTime() -
                mulai
              ) /
              60_000
            )
          );

        const totalPending =
          Number(
            workTicket.lamaPending ||
            0
          );

        waktuPengerjaan =
          Math.max(
            0,
            totalMinutes -
            totalPending
          );
      }
    }

    const status:
      Ticket["status"] =
      workAction === "PENDING"
        ? "PENDING"
        : workAction ===
          "COMPLETED"
          ? "COMPLETED"
          : "ON_GOING";

    const body = {
      status,

      catatan:
        workAction === "RESUME"
          ? workTicket.catatan ||
          null
          : catatan,

      keterangan:
        workAction ===
          "COMPLETED"
          ? keterangan
          : keterangan || null,

      isPending:
        workAction === "PENDING",

      lamaPending:
        workAction === "PENDING"
          ? lamaPending
          : Number(
            workTicket.lamaPending ||
            0
          ),

      mulaiPengerjaan,

      selesaiPengerjaan:
        workAction ===
          "COMPLETED"
          ? nowIso
          : null,

      waktuPengerjaan:
        workAction ===
          "COMPLETED"
          ? waktuPengerjaan
          : workTicket.waktuPengerjaan ??
          null,
    };

    try {
      setSaving(true);
      setFormError("");

      const response =
        await apiFetch(
          `${API_URL}/tickets/${workTicket.id}/progress`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },
            body:
              JSON.stringify(
                body
              ),
          }
        );

      const data =
        await parseJsonResponse<UpdateResponse>(
          response
        );

      if (
        !response.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
          "Gagal memperbarui ticket."
        );
      }

      if (!data.ticket) {
        throw new Error(
          "Backend berhasil merespons, tetapi data ticket terbaru tidak dikembalikan."
        );
      }

      setTickets(
        (
          previousTickets
        ) =>
          previousTickets.map(
            (ticket) =>
              ticket.id ===
                workTicket.id
                ? {
                  ...ticket,
                  ...data.ticket,
                }
                : ticket
          )
      );

      setWorkTicket(null);
      setWorkAction(
        "UPDATE"
      );

      setForm(
        INITIAL_FORM
      );

      setFormError("");

      setSuccess(
        data.message ||
        (
          workAction ===
            "PENDING"
            ? "Ticket berhasil dipindahkan ke Pending."
            : workAction ===
              "RESUME"
              ? "Ticket berhasil dilanjutkan."
              : workAction ===
                "COMPLETED"
                ? "Ticket berhasil diselesaikan."
                : "Progress berhasil disimpan."
        )
      );

      await loadData(false);
    } catch (
    submitError
    ) {
      setFormError(
        submitError instanceof
          Error
          ? submitError.message
          : "Gagal memperbarui ticket."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-5 pb-8">
        <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-7 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03] sm:px-8">
          {/* <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[35%] overflow-hidden lg:block">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-50 dark:bg-brand-500/10" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-theme-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                IT HelpDesk
              </p>

              <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white/90 sm:text-3xl">
                Daily Work
              </h1>

              <p className="mt-3 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Kelola ticket On Going, Pending, dan pekerjaan yang selesai hari ini.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {getInitial(
                    currentUser
                      ?.employee
                      ?.nama ||
                      currentUser
                        ?.email
                  )}
                </div>

                <div>
                  <p className="text-[11px] text-gray-400">
                    IT HelpDesk aktif
                  </p>

                  <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                    {currentUser
                      ?.employee?.nama ||
                      currentUser
                        ?.email ||
                      "Memuat..."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadData(
                    false
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-theme-sm font-semibold text-gray-700 shadow-theme-xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
              >
                <RefreshIcon
                  spinning={
                    refreshing
                  }
                />
                Perbarui
              </button>
            </div>
          </div> */}
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
                IT HelpDesk
              </div>

              <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                Daily Work
              </h1>

              <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Kelola ticket On Going, Pending, dan pekerjaan yang selesai hari ini.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <Alert className="border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </Alert>
        )}

        {success && (
          <Alert className="border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
            {success}
          </Alert>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Pekerjaan Aktif"
            value={
              statistics.total
            }
            description="On Going + Pending"
            tone="brand"
          />

          <SummaryCard
            label="On Going"
            value={
              statistics.ongoing
            }
            description="Sedang dikerjakan"
            tone="purple"
          />

          <SummaryCard
            label="Pending"
            value={
              statistics.pending
            }
            description="Menunggu tindak lanjut"
            tone="warning"
          />

          <SummaryCard
            label="Selesai Hari Ini"
            value={
              statistics.completedToday
            }
            description={`${statistics.overdue} ticket melewati estimasi`}
            tone="success"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 pt-5 dark:border-gray-800">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  Daftar Pekerjaan
                </h2>

                <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                  Menampilkan{" "}
                  {
                    filteredTickets.length
                  }{" "}
                  ticket.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                <div className="relative w-full sm:w-[280px]">
                  <SearchIcon />

                  <input
                    value={search}
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Cari ticket..."
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-theme-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div className="relative w-full sm:w-[165px]">
                  <select
                    value={priorityFilter}
                    onChange={(event) =>
                      setPriorityFilter(
                        event.target.value as PriorityFilter
                      )
                    }
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-11 text-theme-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="ALL">
                      Semua Posisi
                    </option>
                    <option value="1">
                      Direksi
                    </option>
                    <option value="2">
                      VP/EVP
                    </option>
                    <option value="3">
                      Manager
                    </option>
                    <option value="4">
                      Staff
                    </option>
                  </select>

                  <ChevronDownIcon />
                </div>

                <div className="relative w-full sm:w-[175px]">
                  <select
                    value={sortMode}
                    onChange={(event) =>
                      setSortMode(
                        event.target.value as SortMode
                      )
                    }
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-11 text-theme-sm text-gray-700 outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="PRIORITY">
                      Priority
                    </option>

                    <option value="DEADLINE">
                      Estimasi Terdekat
                    </option>

                    <option value="NEWEST">
                      Terbaru
                    </option>

                    <option value="OLDEST">
                      Terlama
                    </option>
                  </select>

                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-1 overflow-x-auto">
              <TabButton
                active={
                  activeTab ===
                  "ALL"
                }
                label="Semua Aktif"
                count={
                  statistics.total
                }
                onClick={() =>
                  setActiveTab(
                    "ALL"
                  )
                }
              />

              <TabButton
                active={
                  activeTab ===
                  "ON_GOING"
                }
                label="On Going"
                count={
                  statistics.ongoing
                }
                onClick={() =>
                  setActiveTab(
                    "ON_GOING"
                  )
                }
              />

              <TabButton
                active={
                  activeTab ===
                  "PENDING"
                }
                label="Pending"
                count={
                  statistics.pending
                }
                onClick={() =>
                  setActiveTab(
                    "PENDING"
                  )
                }
              />

              <TabButton
                active={
                  activeTab ===
                  "COMPLETED_TODAY"
                }
                label="Selesai Hari Ini"
                count={
                  statistics.completedToday
                }
                onClick={() =>
                  setActiveTab(
                    "COMPLETED_TODAY"
                  )
                }
              />
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : paginatedTickets
            .length === 0 ? (
            <EmptyState
              tab={activeTab}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1150px] table-fixed">
                  <colgroup>
                    <col className="w-[15%]" />
                    <col className="w-[17%]" />
                    <col className="w-[27%]" />
                    <col className="w-[10%]" />
                    <col className="w-[16%]" />
                    <col className="w-[15%]" />
                  </colgroup>

                  <thead className="bg-gray-50/80 dark:bg-gray-900">
                    <tr>
                      <TableHeader>
                        No. Ticket
                      </TableHeader>
                      <TableHeader>
                        Pelapor
                      </TableHeader>
                      <TableHeader>
                        Pekerjaan
                      </TableHeader>
                      <TableHeader>
                        Status
                      </TableHeader>
                      <TableHeader>
                        Estimasi
                      </TableHeader>
                      <TableHeader align="center">
                        Aksi
                      </TableHeader>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginatedTickets.map(
                      (ticket) => {
                        const employee =
                          getEmployee(
                            ticket
                          );

                        const remaining =
                          getRemainingTime(
                            ticket.estimasiPengerjaan
                          );

                        const status =
                          normalizeStatus(
                            ticket.status
                          );

                        return (
                          <tr
                            key={
                              ticket.id
                            }
                            className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                          >
                            <td className="px-5 py-5 align-top">
                              <p className="break-all text-theme-xs font-bold text-brand-600 dark:text-brand-400">
                                {
                                  ticket.noPelaporan
                                }
                              </p>
                            </td>

                            <td className="px-5 py-5 align-top">
                              <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                                {getReporterName(
                                  ticket
                                )}
                              </p>

                              <p className="mt-1 truncate text-theme-xs text-gray-400">
                                {employee?.nik ||
                                  "-"}
                              </p>

                              <p className="mt-1 truncate text-[11px] text-gray-400">
                                {employee?.unitKerja ||
                                  "-"}
                              </p>
                            </td>

                            <td className="px-5 py-5 align-top">
                              <p className="line-clamp-2 text-theme-sm font-semibold leading-6 text-gray-800 dark:text-white/90">
                                {ticket.keluhan ||
                                  "Keluhan tidak tersedia"}
                              </p>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-theme-xs text-gray-400">
                                  {ticket.kategoriKeluhan ||
                                    "Kategori belum ditentukan"}
                                </span>

                                <PriorityBadge
                                  priority={
                                    ticket.priority
                                  }
                                />
                              </div>

                              {ticket.hasilAnalisa && (
                                <p className="mt-2 line-clamp-1 text-[11px] text-gray-500 dark:text-gray-400">
                                  Analisa:{" "}
                                  {
                                    ticket.hasilAnalisa
                                  }
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-5 align-top">
                              <StatusBadge
                                status={
                                  ticket.status
                                }
                              />

                              {status ===
                                "PENDING" && (
                                  <p className="mt-2 text-[11px] text-gray-400">
                                    {ticket.lamaPending ||
                                      0}{" "}
                                    menit
                                  </p>
                                )}
                            </td>

                            <td className="px-5 py-5 align-top">
                              {status ===
                                "COMPLETED" ? (
                                <>
                                  <p className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                                    Selesai
                                  </p>

                                  <p className="mt-2 text-[11px] text-success-600 dark:text-success-400">
                                    {formatDateTime(
                                      ticket.selesaiPengerjaan
                                    )}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {formatDateTime(
                                      ticket.estimasiPengerjaan
                                    )}
                                  </p>

                                  <p
                                    className={`mt-2 text-[11px] font-semibold ${remaining.className}`}
                                  >
                                    {
                                      remaining.label
                                    }
                                  </p>
                                </>
                              )}
                            </td>

                            <td className="relative px-5 py-5 text-center align-top">
                              <div
                                className="relative inline-block text-center"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenActionMenu((current) =>
                                      current === ticket.id
                                        ? null
                                        : ticket.id
                                    )
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                  aria-label="Buka menu aksi"
                                  aria-expanded={
                                    openActionMenu === ticket.id
                                  }
                                >
                                  <MoreIcon />
                                </button>

                                {openActionMenu === ticket.id && (
                                  <div className="absolute right-0 top-11 z-30 min-w-[190px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                                    <ActionMenuButton
                                      label="Lihat Detail"
                                      icon={<EyeIcon />}
                                      onClick={() => {
                                        setDetailTicket(ticket);
                                        setOpenActionMenu(null);
                                      }}
                                    />

                                    {status === "ON_GOING" && (
                                      <>
                                        <ActionMenuButton
                                          label="Update Pengerjaan"
                                          icon={<EditIcon />}
                                          onClick={() => {
                                            openWorkModal(
                                              ticket,
                                              "UPDATE"
                                            );
                                            setOpenActionMenu(null);
                                          }}
                                        />

                                        <ActionMenuButton
                                          label="Pending Ticket"
                                          icon={<PauseIcon />}
                                          tone="warning"
                                          onClick={() => {
                                            openWorkModal(
                                              ticket,
                                              "PENDING"
                                            );
                                            setOpenActionMenu(null);
                                          }}
                                        />

                                        <ActionMenuButton
                                          label="Selesaikan Ticket"
                                          icon={<CheckActionIcon />}
                                          tone="success"
                                          onClick={() => {
                                            openWorkModal(
                                              ticket,
                                              "COMPLETED"
                                            );
                                            setOpenActionMenu(null);
                                          }}
                                        />
                                      </>
                                    )}

                                    {status === "PENDING" && (
                                      <ActionMenuButton
                                        label="Lanjutkan Pengerjaan"
                                        icon={<ResumeIcon />}
                                        onClick={() => {
                                          openWorkModal(
                                            ticket,
                                            "RESUME"
                                          );
                                          setOpenActionMenu(null);
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 p-4 lg:hidden">
                {paginatedTickets.map(
                  (ticket) => {
                    const status =
                      normalizeStatus(
                        ticket.status
                      );

                    const remaining =
                      getRemainingTime(
                        ticket.estimasiPengerjaan
                      );

                    return (
                      <article
                        key={
                          ticket.id
                        }
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-all text-theme-xs font-bold text-brand-600 dark:text-brand-400">
                              {
                                ticket.noPelaporan
                              }
                            </p>

                            <h3 className="mt-2 line-clamp-2 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                              {ticket.keluhan ||
                                "Keluhan tidak tersedia"}
                            </h3>
                          </div>

                          <StatusBadge
                            status={
                              ticket.status
                            }
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <MobileInfo
                            label="Pelapor"
                            value={getReporterName(
                              ticket
                            )}
                          />

                          <MobileInfo
                            label="Priority"
                            value={getPriorityLabel(
                              ticket.priority
                            )}
                          />

                          <MobileInfo
                            label={
                              status ===
                                "COMPLETED"
                                ? "Selesai"
                                : "Estimasi"
                            }
                            value={formatDateTime(
                              status ===
                                "COMPLETED"
                                ? ticket.selesaiPengerjaan
                                : ticket.estimasiPengerjaan
                            )}
                          />

                          <MobileInfo
                            label="Informasi"
                            value={
                              status ===
                                "PENDING"
                                ? `${ticket.lamaPending || 0} menit pending`
                                : status ===
                                  "COMPLETED"
                                  ? "Pekerjaan selesai"
                                  : remaining.label
                            }
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <IconActionButton
                            title="Lihat Detail"
                            tone="default"
                            onClick={() =>
                              setDetailTicket(ticket)
                            }
                          >
                            <EyeIcon />
                          </IconActionButton>

                          {status === "ON_GOING" && (
                            <>
                              <IconActionButton
                                title="Update Pengerjaan"
                                tone="brand"
                                onClick={() =>
                                  openWorkModal(
                                    ticket,
                                    "UPDATE"
                                  )
                                }
                              >
                                <EditIcon />
                              </IconActionButton>

                              <IconActionButton
                                title="Pending Ticket"
                                tone="warning"
                                onClick={() =>
                                  openWorkModal(
                                    ticket,
                                    "PENDING"
                                  )
                                }
                              >
                                <PauseIcon />
                              </IconActionButton>

                              <IconActionButton
                                title="Selesaikan Ticket"
                                tone="success"
                                onClick={() =>
                                  openWorkModal(
                                    ticket,
                                    "COMPLETED"
                                  )
                                }
                              >
                                <CheckActionIcon />
                              </IconActionButton>
                            </>
                          )}

                          {status === "PENDING" && (
                            <IconActionButton
                              title="Lanjutkan Pengerjaan"
                              tone="brand"
                              onClick={() =>
                                openWorkModal(
                                  ticket,
                                  "RESUME"
                                )
                              }
                            >
                              <ResumeIcon />
                            </IconActionButton>
                          )}
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </>
          )}

          {!loading &&
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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                  >
                    ‹
                  </button>

                  <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-brand-500 px-3 text-theme-xs font-semibold text-brand-600 dark:text-brand-400">
                    {currentPage}
                  </span>

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
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
        </section>
      </div>

      {detailTicket && (
        <TicketDetail
          ticket={detailTicket}
          onClose={() =>
            setDetailTicket(
              null
            )
          }
        />
      )}

      {workTicket && (
        <WorkModal
          ticket={workTicket}
          action={workAction}
          form={form}
          saving={saving}
          error={formError}
          onChange={setForm}
          onClose={
            closeWorkModal
          }
          onSubmit={
            submitWork
          }
        />
      )}
    </>
  );
}

function WorkModal({
  ticket,
  action,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  ticket: Ticket;
  action: WorkAction;
  form: WorkForm;
  saving: boolean;
  error: string;
  onChange: React.Dispatch<
    React.SetStateAction<WorkForm>
  >;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>
  ) => void;
}) {
  const employee =
    getEmployee(ticket);

  const reporterName =
    getReporterName(ticket);

  const handlerName =
    ticket.handler?.employee?.nama ||
    ticket.handler?.email ||
    "Belum ditugaskan";

  const remaining =
    getRemainingTime(
      ticket.estimasiPengerjaan
    );

  const config: Record<
    WorkAction,
    {
      title: string;
      description: string;
      button: string;
      tone: string;
      iconClass: string;
      icon: React.ReactNode;
    }
  > = {
    UPDATE: {
      title: "Update Pengerjaan",
      description:
        "Catat perkembangan terbaru selama ticket dikerjakan.",
      button: "Simpan Progress",
      tone:
        "bg-brand-500 hover:bg-brand-600",
      iconClass:
        "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      icon: <EditIcon />,
    },

    PENDING: {
      title: "Pending Ticket",
      description:
        "Tunda pengerjaan ticket untuk sementara.",
      button: "Simpan sebagai Pending",
      tone:
        "bg-warning-500 hover:bg-warning-600",
      iconClass:
        "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
      icon: <PauseIcon />,
    },

    RESUME: {
      title: "Lanjutkan Pengerjaan",
      description:
        "Kembalikan ticket Pending menjadi On Going.",
      button: "Lanjutkan Ticket",
      tone:
        "bg-brand-500 hover:bg-brand-600",
      iconClass:
        "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      icon: <ResumeIcon />,
    },

    COMPLETED: {
      title: "Selesaikan Ticket",
      description:
        "Simpan hasil akhir dan tandai ticket selesai.",
      button: "Selesaikan Ticket",
      tone:
        "bg-success-500 hover:bg-success-600",
      iconClass:
        "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
      icon: <CheckActionIcon />,
    },
  };

  const currentConfig =
    config[action];

  const nextStatus =
    action === "PENDING"
      ? "Pending"
      : action === "COMPLETED"
        ? "Completed"
        : "On Going";

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={onClose}
    >
      <form
        onSubmit={onSubmit}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
        className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
      >
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${currentConfig.iconClass}`}
            >
              {currentConfig.icon}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentConfig.title}
                </h2>

                <StatusBadge
                  status={ticket.status}
                />
              </div>

              <p className="mt-1 break-all text-theme-sm font-semibold text-brand-600 dark:text-brand-400">
                {ticket.noPelaporan}
              </p>

              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {
                  currentConfig.description
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            ×
          </button>
        </header>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 sm:p-6">
            {error && (
              <Alert className="border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </Alert>
            )}

            {/* Informasi Pelapor */}
            <WorkInfoSection
              title="Informasi Pelapor"
              icon={<UserInfoIcon />}
              iconClass="bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
            >
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-theme-xs font-bold text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                    {getInitial(
                      reporterName
                    )}
                  </div>

                  <WorkInfoValue
                    label="Pelapor"
                    value={reporterName}
                    secondary={
                      employee?.nik || "-"
                    }
                  />
                </div>

                <WorkInfoValue
                  label="Jabatan"
                  value={
                    employee?.jabatan || "-"
                  }
                />

                <WorkInfoValue
                  label="Unit Kerja"
                  value={
                    employee?.unitKerja ||
                    "-"
                  }
                />

                <WorkInfoValue
                  label="Email"
                  value={
                    ticket.reporter
                      ?.email || "-"
                  }
                />

                <WorkInfoValue
                  label="NIK"
                  value={
                    employee?.nik || "-"
                  }
                />

                <WorkInfoValue
                  label="Job Title"
                  value={
                    employee?.jobTitle ||
                    "-"
                  }
                />

                <WorkInfoValue
                  label="Waktu Keluhan"
                  value={formatDateTime(
                    ticket.waktuKeluhan ||
                    ticket.createdAt
                  )}
                />

                <WorkInfoValue
                  label="Nomor Pelaporan"
                  value={
                    ticket.noPelaporan ||
                    "-"
                  }
                />
              </div>
            </WorkInfoSection>

            {/* Keluhan dan Penugasan */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <WorkInfoSection
                title="Keluhan"
                icon={<DocumentInfoIcon />}
                iconClass="bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
              >
                <p className="whitespace-pre-wrap break-words text-theme-sm font-medium leading-6 text-gray-800 dark:text-gray-200">
                  {ticket.keluhan ||
                    "Keluhan tidak tersedia."}
                </p>

                {ticket.hasilAnalisa && (
                  <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Hasil Analisa
                    </p>

                    <p className="mt-2 whitespace-pre-wrap break-words text-theme-sm leading-6 text-gray-700 dark:text-gray-300">
                      {
                        ticket.hasilAnalisa
                      }
                    </p>
                  </div>
                )}
              </WorkInfoSection>

              <WorkInfoSection
                title="Informasi Penugasan"
                icon={<AssignmentInfoIcon />}
                iconClass="bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                      {getInitial(
                        handlerName
                      )}
                    </div>

                    <WorkInfoValue
                      label="PIC / Handler"
                      value={handlerName}
                      secondary={
                        ticket.handler
                          ?.employee
                          ?.jobTitle ||
                        "IT HelpDesk"
                      }
                    />
                  </div>

                  <WorkInfoValue
                    label="Kategori Keluhan"
                    value={
                      ticket.kategoriKeluhan ||
                      "Belum ditentukan"
                    }
                  />

                  <WorkInfoValue
                    label="Priority"
                    value={`${getPriorityLabel(
                      ticket.priority
                    )}`}
                    secondary={`Priority ${ticket.priority || "-"
                      }`}
                  />

                  <WorkInfoValue
                    label="SLA"
                    value={
                      ticket.sla
                        ? `${ticket.sla} jam`
                        : "Belum ditentukan"
                    }
                    secondary={formatDateTime(
                      ticket.batasResponse
                    )}
                  />

                  <WorkInfoValue
                    label="Eskalasi"
                    value={
                      ticket.eskalasi || "-"
                    }
                  />

                  <WorkInfoValue
                    label="Estimasi Pengerjaan"
                    value={formatDateTime(
                      ticket.estimasiPengerjaan
                    )}
                  />
                </div>
              </WorkInfoSection>
            </div>

            {/* Informasi Pengerjaan */}
            <WorkInfoSection
              title="Informasi Pengerjaan"
              icon={<WorkInfoIcon />}
              iconClass="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
            >
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <WorkInfoValue
                  label="Status"
                  value={getStatusLabel(
                    ticket.status
                  )}
                />

                <WorkInfoValue
                  label="Mulai Pengerjaan"
                  value={formatDateTime(
                    ticket.mulaiPengerjaan
                  )}
                />

                <WorkInfoValue
                  label="Estimasi Selesai"
                  value={formatDateTime(
                    ticket.estimasiPengerjaan
                  )}
                  secondary={
                    normalizeStatus(
                      ticket.status
                    ) === "COMPLETED"
                      ? "Pekerjaan sudah selesai"
                      : remaining.label
                  }
                  secondaryClass={
                    remaining.className
                  }
                />

                <WorkInfoValue
                  label="Selesai Pengerjaan"
                  value={formatDateTime(
                    ticket.selesaiPengerjaan
                  )}
                />

                <WorkInfoValue
                  label="Status Pending"
                  value={
                    ticket.isPending
                      ? "Ya"
                      : "Tidak"
                  }
                />

                <WorkInfoValue
                  label="Lama Pending"
                  value={
                    ticket.lamaPending
                      ? `${ticket.lamaPending} menit`
                      : "-"
                  }
                />

                <WorkInfoValue
                  label="Waktu Pengerjaan"
                  value={
                    ticket.waktuPengerjaan
                      ? `${ticket.waktuPengerjaan} menit`
                      : "-"
                  }
                />

                <WorkInfoValue
                  label="Terakhir Diperbarui"
                  value={formatDateTime(
                    ticket.updatedAt
                  )}
                />
              </div>
            </WorkInfoSection>

            {/* Form yang dapat diedit */}
            <WorkInfoSection
              title={
                action === "UPDATE"
                  ? "Pembaruan Progress"
                  : action ===
                    "PENDING"
                    ? "Informasi Pending"
                    : action ===
                      "COMPLETED"
                      ? "Penyelesaian Ticket"
                      : "Lanjutkan Ticket"
              }
              icon={
                currentConfig.icon
              }
              iconClass={
                currentConfig.iconClass
              }
            >
              {action === "RESUME" ? (
                <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-5 text-theme-sm leading-6 text-gray-700 dark:border-brand-500/30 dark:bg-brand-500/[0.08] dark:text-gray-300">
                  Ticket akan dikembalikan
                  dari status{" "}
                  <strong>Pending</strong>{" "}
                  menjadi{" "}
                  <strong>On Going</strong>.
                  Waktu mulai pengerjaan yang
                  sebelumnya sudah tersimpan
                  tidak akan diubah.
                </div>
              ) : (
                <div className="space-y-5">
                  <Field
                    label="Catatan Pengerjaan"
                    required
                  >
                    <textarea
                      rows={5}
                      value={
                        form.catatan
                      }
                      disabled={saving}
                      onChange={(
                        event
                      ) =>
                        onChange(
                          (
                            previous
                          ) => ({
                            ...previous,
                            catatan:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder="Tuliskan pekerjaan yang telah dilakukan, kendala, dan perkembangan terbaru..."
                      className={
                        textareaClass
                      }
                    />
                  </Field>

                  {action ===
                    "PENDING" && (
                      <Field
                        label="Lama Pending"
                        required
                      >
                        <div className="relative max-w-sm">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={
                              form.lamaPending
                            }
                            disabled={
                              saving
                            }
                            onChange={(
                              event
                            ) =>
                              onChange(
                                (
                                  previous
                                ) => ({
                                  ...previous,
                                  lamaPending:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Contoh: 60"
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 pr-20 text-theme-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          />

                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-theme-xs font-medium text-gray-400">
                            menit
                          </span>
                        </div>
                      </Field>
                    )}

                  <Field
                    label={
                      action ===
                        "COMPLETED"
                        ? "Hasil Pengerjaan"
                        : "Keterangan"
                    }
                    required={
                      action ===
                      "COMPLETED"
                    }
                  >
                    <textarea
                      rows={4}
                      value={
                        form.keterangan
                      }
                      disabled={saving}
                      onChange={(
                        event
                      ) =>
                        onChange(
                          (
                            previous
                          ) => ({
                            ...previous,
                            keterangan:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      placeholder={
                        action ===
                          "COMPLETED"
                          ? "Tuliskan hasil akhir penyelesaian ticket..."
                          : "Tambahkan keterangan jika diperlukan..."
                      }
                      className={
                        textareaClass
                      }
                    />
                  </Field>
                </div>
              )}
            </WorkInfoSection>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-theme-xs text-gray-400">
            Status setelah disimpan:{" "}
            <strong className="text-gray-700 dark:text-gray-300">
              {nextStatus}
            </strong>
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                (action !==
                  "RESUME" &&
                  !form.catatan.trim()) ||
                (action ===
                  "COMPLETED" &&
                  !form.keterangan.trim()) ||
                (action ===
                  "PENDING" &&
                  !form.lamaPending)
              }
              className={`inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-lg px-5 text-theme-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${currentConfig.tone}`}
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}

              {saving
                ? "Menyimpan..."
                : currentConfig.button}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function WorkInfoSection({
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

      <div className="p-4">
        {children}
      </div>
    </section>
  );
}

function WorkInfoValue({
  label,
  value,
  secondary,
  secondaryClass = "text-gray-400",
}: {
  label: string;
  value: string;
  secondary?: string;
  secondaryClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-theme-xs font-semibold leading-5 text-gray-800 dark:text-white/90">
        {value || "-"}
      </p>

      {secondary && (
        <p
          className={`mt-0.5 break-words text-[11px] ${secondaryClass}`}
        >
          {secondary}
        </p>
      )}
    </div>
  );
}

type SummaryTone =
  | "brand"
  | "purple"
  | "warning"
  | "success";

function SummaryCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: SummaryTone;
}) {
  const styles = {
    brand:
      "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    purple:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
    warning:
      "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    success:
      "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles[tone]}`}
        >
          <WorkIcon />
        </div>

        <div>
          <p className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>

          <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-white/90">
            {value}
          </p>
        </div>
      </div>

      <p className="mt-4 text-theme-xs text-gray-400">
        {description}
      </p>
    </article>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-theme-sm font-semibold transition ${active
        ? "border-brand-500 text-brand-600 dark:text-brand-400"
        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
    >
      {label}

      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] ${active
          ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          }`}
      >
        {count}
      </span>
    </button>
  );
}

function PriorityBadge({
  priority,
}: {
  priority?: number | null;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getPriorityClass(
        priority
      )}`}
    >
      {getPriorityLabel(
        priority
      )}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${getStatusClass(
        status
      )}`}
    >
      {getStatusLabel(
        status
      )}
    </span>
  );
}

function Alert({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 text-theme-sm ${className}`}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}

        {required && (
          <span className="ml-1 text-error-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
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
      <p className="text-[10px] uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
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
      className={`px-5 py-4 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${align === "center"
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

function LoadingState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat Daily Work...
      </p>
    </div>
  );
}

function EmptyState({
  tab,
}: {
  tab: WorkTab;
}) {
  const messages: Record<
    WorkTab,
    string
  > = {
    ALL:
      "Belum ada ticket aktif yang sedang dikerjakan atau dipending.",
    ON_GOING:
      "Belum ada ticket berstatus On Going.",
    PENDING:
      "Belum ada ticket berstatus Pending.",
    COMPLETED_TODAY:
      "Belum ada ticket yang selesai hari ini.",
  };

  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
        <CheckIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        Tidak ada ticket
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        {messages[tab]}
      </p>
    </div>
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
        d="m20 20-3.5-3.5"
        strokeLinecap="round"
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
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-4 w-4 ${spinning
        ? "animate-spin"
        : ""
        }`}
    >
      <path
        d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <rect
        x="4"
        y="7"
        width="16"
        height="12"
        rx="2"
      />

      <path
        d="M9 7V5h6v2M4 12h16"
        strokeLinecap="round"
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
      strokeWidth="1.8"
      className="h-7 w-7"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        d="m8.5 12 2.25 2.25 4.75-5"
        strokeLinecap="round"
        strokeLinejoin="round"
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
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
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
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z"
      />
    </svg>
  );
}

function CheckActionIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

type ActionMenuTone =
  | "default"
  | "warning"
  | "success";

function ActionMenuButton({
  label,
  icon,
  tone = "default",
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  tone?: ActionMenuTone;
  onClick: () => void;
}) {
  const styles: Record<
    ActionMenuTone,
    string
  > = {
    default:
      "text-gray-700 hover:bg-gray-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-brand-400",

    warning:
      "text-warning-700 hover:bg-warning-50 dark:text-warning-400 dark:hover:bg-warning-500/10",

    success:
      "text-success-700 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-theme-xs font-semibold transition ${styles[tone]}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center">
        {icon}
      </span>

      <span>{label}</span>
    </button>
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

function UserInfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <circle
        cx="12"
        cy="8"
        r="3"
      />

      <path
        strokeLinecap="round"
        d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6"
      />
    </svg>
  );
}

function DocumentInfoIcon() {
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
        d="M7 3.5h7l4 4V20H7V3.5Z"
      />

      <path d="M14 3.5V8h4" />
    </svg>
  );
}

function AssignmentInfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
      />

      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}

function WorkInfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect
        x="4"
        y="7"
        width="16"
        height="12"
        rx="2"
      />

      <path d="M9 7V5h6v2M4 12h16" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
    >
      <path
        d="m6 9 6 6 6-6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const textareaClass =
  "w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-theme-sm leading-6 text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";