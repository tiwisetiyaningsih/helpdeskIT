import { prisma } from "../../config/prisma";
import { ticketService } from "./ticket.service";
import { TicketStatus } from "@prisma/client";
import {
  ROLE_GROUPS,
  ROLE_NAME_IT_HELPDESK,
} from "../../middleware/permission";


type AuthenticatedUser = {
  id?: number | string;
  userId?: number | string;
};

function getAuthenticatedUserId(
  user: AuthenticatedUser | undefined
) {
  const rawId = user?.id ?? user?.userId;
  const userId = Number(rawId);

  if (!rawId || Number.isNaN(userId)) {
    throw new Error(
      "Data pengguna login tidak valid."
    );
  }

  return userId;
}

function calculatePriority(
  jabatan?: string
) {
  const normalized = String(jabatan || "")
    .trim()
    .toUpperCase();

  if (
    normalized.includes("DIREKSI") ||
    normalized.includes("DIREKTUR")
  ) {
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

  return 4;
}

function optionalString(value: unknown) {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const result = String(value).trim();

  return result || null;
}


function optionalDate(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const date =
    new Date(String(value));

  if (
    Number.isNaN(date.getTime())
  ) {
    throw new Error(
      "Format tanggal tidak valid."
    );
  }

  return date;
}

function optionalNumber(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    throw new Error(
      "Lama pending harus berupa angka."
    );
  }

  return numberValue;
}

export const ticketController = {
  async create(context: any) {
    const {
      body,
      user,
      set,
    } = context;

    try {
      const reporterId =
        getAuthenticatedUserId(user);

      const employee =
        await prisma.employee.findFirst({
          where: {
            user: {
              id: reporterId,
            },
          },
        });

      const priority =
        calculatePriority(
          employee?.jabatan
        );

      const keluhan =
        String(body.keluhan || "").trim();

      if (!keluhan) {
        set.status = 400;

        return {
          success: false,
          message:
            "Deskripsi keluhan wajib diisi.",
        };
      }

      if (keluhan.length < 10) {
        set.status = 400;

        return {
          success: false,
          message:
            "Deskripsi keluhan minimal 10 karakter.",
        };
      }

      const evidence =
        body.evidence instanceof File
          ? body.evidence
          : undefined;

      console.log(
        "Evidence diterima:",
        evidence
          ? {
            name: evidence.name,
            type: evidence.type,
            size: evidence.size,
          }
          : null
      );

      const ticket =
        await ticketService.create({
          reporterId,
          keluhan,
          priority,
          evidence,
        });

      set.status = 201;

      return {
        success: true,
        message:
          "Keluhan berhasil dibuat.",
        ticket,
      };
    } catch (error) {
      console.error(
        "CREATE TICKET ERROR:",
        error
      );

      set.status = 500;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal membuat keluhan.",
      };
    }
  },

  async getAllTickets(context: any) {
    const { user, set } = context;

    try {
      const userId =
        getAuthenticatedUserId(user);

      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        });

      if (!currentUser) {
        set.status = 401;

        return {
          success: false,
          message:
            "Pengguna tidak ditemukan.",
        };
      }

      const roleName = String(
        currentUser.role?.name || ""
      )
        .trim()
        .toUpperCase();

      console.log(
        "ROLE AKSES TICKET:",
        roleName
      );

      if (
        !ROLE_GROUPS.ADMIN_OR_IT_HELPDESK.includes(
          roleName
        )
      ) {
        set.status = 403;

        return {
          success: false,
          message:
            "Anda tidak memiliki akses untuk melihat seluruh ticket.",
        };
      }

      const tickets =
        await ticketService.getAllTickets();

      return {
        success: true,
        tickets,
      };
    } catch (error) {
      console.error(
        "GET ALL TICKETS ERROR:",
        error
      );

      set.status = 500;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil data ticket.",
      };
    }
  },

  async assignTicketByAdmin(context: any) {
    const {
  params,
  user,
  body,
  set,
} = context;

    try {
      const adminId =
        getAuthenticatedUserId(user);

      const ticketId =
        Number(params.id);

      if (
        Number.isNaN(ticketId) ||
        ticketId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID ticket tidak valid.",
        };
      }

      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: adminId,
          },

          select: {
            id: true,
            isActive: true,

            role: {
              select: {
                name: true,
              },
            },
          },
        });

      if (!currentUser) {
        set.status = 401;

        return {
          success: false,
          message:
            "Pengguna tidak ditemukan.",
        };
      }

      if (!currentUser.isActive) {
        set.status = 403;

        return {
          success: false,
          message:
            "Akun Anda sedang tidak aktif.",
        };
      }

      const roleName = String(
        currentUser.role?.name || ""
      )
        .trim()
        .toUpperCase();

      if (
        !ROLE_GROUPS.ADMIN.includes(roleName)
      ) {
        set.status = 403;

        return {
          success: false,
          message:
            "Hanya Admin yang dapat menugaskan ticket.",
        };
      }

      const handlerId =
        Number(body.handlerId);

      if (
        Number.isNaN(handlerId) ||
        handlerId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "IT HelpDesk wajib dipilih.",
        };
      }

      const kategoriKeluhan =
        String(
          body.kategoriKeluhan || ""
        ).trim();

      if (!kategoriKeluhan) {
        set.status = 400;

        return {
          success: false,
          message:
            "Kategori keluhan wajib diisi.",
        };
      }

      const sla =
        Number(body.sla);

      if (
        !Number.isInteger(sla) ||
        sla <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "SLA harus berupa jumlah jam lebih dari 0.",
        };
      }

      let estimasiPengerjaan:
        | Date
        | null = null;

      if (
        body.estimasiPengerjaan
      ) {
        const parsedDate =
          new Date(
            String(
              body.estimasiPengerjaan
            )
          );

        if (
          Number.isNaN(
            parsedDate.getTime()
          )
        ) {
          set.status = 400;

          return {
            success: false,
            message:
              "Estimasi pengerjaan tidak valid.",
          };
        }

        estimasiPengerjaan =
          parsedDate;
      }

      const ticket =
        await ticketService.assignTicketByAdmin(
          ticketId,
          {
            handlerId,
            kategoriKeluhan,
            priority:
              Number(body.priority) ||
              4,
            sla,

            eskalasi:
              optionalString(
                body.eskalasi
              ) ?? null,

            batasResponse:
              optionalDate(
                body.batasResponse
              ) ?? null,

            estimasiPengerjaan:
              optionalDate(
                body.estimasiPengerjaan
              ) ?? null,

            selesaiResponse:
              optionalString(
                body.selesaiResponse
              ) ?? null,

            keteranganResponse:
              optionalString(
                body.keteranganResponse
              ) ?? null,
          }
        );

      return {
        success: true,
        message:
          "Ticket berhasil ditugaskan kepada IT HelpDesk.",
        ticket,
      };
    } catch (error) {
      console.error(
        "ADMIN ASSIGN TICKET ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Gagal menugaskan ticket.";

      if (
        message.includes(
          "tidak ditemukan"
        )
      ) {
        set.status = 404;
      } else if (
        message.includes(
          "tidak dapat ditugaskan"
        )
      ) {
        set.status = 409;
      } else if (
        message.includes(
          "Hanya Admin"
        )
      ) {
        set.status = 403;
      } else {
        set.status = 400;
      }

      return {
        success: false,
        message,
      };
    }
  },

  async getMyTickets(context: any) {
    const {
      user,
      set,
    } = context;

    try {
      const reporterId =
        getAuthenticatedUserId(user);

      const tickets =
        await ticketService.getMyTickets(
          reporterId
        );

      return {
        success: true,
        tickets,
      };
    } catch (error) {
      console.error(
        "GET MY TICKETS ERROR:",
        error
      );

      set.status = 500;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil ticket.",
      };
    }
  },

  async startTicketWork(context: any) {
    const {
      user,
      params,
      set,
    } = context;

    try {
      const handlerId =
        getAuthenticatedUserId(user);

      const ticketId =
        Number(params.id);

      if (
        Number.isNaN(ticketId) ||
        ticketId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID ticket tidak valid.",
        };
      }

      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: handlerId,
          },

          select: {
            id: true,
            isActive: true,

            role: {
              select: {
                name: true,
              },
            },
          },
        });

      if (!currentUser) {
        set.status = 401;

        return {
          success: false,
          message:
            "Pengguna tidak ditemukan.",
        };
      }

      const roleName = String(
        currentUser.role?.name || ""
      )
        .trim()
        .toUpperCase();

      if (!ROLE_GROUPS.IT_HELPDESK.includes(roleName)) {
        set.status = 403;

        return {
          success: false,
          message:
            "Hanya IT HelpDesk yang dapat mengambil ticket.",
        };
      }

      const ticket =
        await ticketService.startTicketWork(
          ticketId,
          handlerId
        );

      return {
        success: true,
        message:
          "Ticket berhasil diambil.",
        ticket,
      };
    } catch (error) {
      console.error(
        "ASSIGN TICKET ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil ticket.";

      if (
        message.includes(
          "tidak ditemukan"
        )
      ) {
        set.status = 404;
      } else if (
        message.includes(
          "sudah diambil"
        )
      ) {
        set.status = 409;
      } else if (
        message.includes(
          "Hanya IT HelpDesk"
        )
      ) {
        set.status = 403;
      } else {
        set.status = 500;
      }

      return {
        success: false,
        message,
      };
    }
  },

  async getTicketDetail(context: any) {
    const {
      user,
      params,
      set,
    } = context;

    try {
      const userId =
        getAuthenticatedUserId(user);

      const ticketId =
        Number(params.id);

      if (
        Number.isNaN(ticketId) ||
        ticketId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID ticket tidak valid.",
        };
      }

      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        });

      const roleName = String(
        currentUser?.role?.name || ""
      )
        .trim()
        .toUpperCase();

      if (
        !ROLE_GROUPS.ADMIN_OR_IT_HELPDESK.includes(
          roleName
        )
      ) {
        set.status = 403;

        return {
          success: false,
          message:
            "Anda tidak memiliki akses ke detail ticket ini.",
        };
      }

      const ticket =
        await ticketService.getTicketDetail(
          ticketId
        );

      return {
        success: true,
        ticket,
      };
    } catch (error) {
      console.error(
        "GET TICKET DETAIL ERROR:",
        error
      );

      set.status = 404;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Ticket tidak ditemukan.",
      };
    }
  },

  async updateTicketProgress(
    context: any
  ) {
    const {
      user,
      params,
      body,
      set,
    } = context;

    try {
      const actingUserId =
        getAuthenticatedUserId(user);

      const ticketId =
        Number(params.id);

      if (
        Number.isNaN(ticketId) ||
        ticketId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID ticket tidak valid.",
        };
      }

      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: actingUserId,
          },

          select: {
            isActive: true,

            role: {
              select: {
                name: true,
              },
            },
          },
        });

      if (!currentUser) {
        set.status = 401;

        return {
          success: false,
          message:
            "Pengguna tidak ditemukan.",
        };
      }

      if (!currentUser.isActive) {
        set.status = 403;

        return {
          success: false,
          message:
            "Akun Anda sedang tidak aktif.",
        };
      }

      const roleName =
        currentUser.role.name
          .trim()
          .toUpperCase();

      const isAdmin =
        ROLE_GROUPS.ADMIN.includes(roleName);

      if (
        !ROLE_GROUPS.ADMIN_OR_IT_HELPDESK.includes(
          roleName
        )
      ) {
        set.status = 403;
        return {
          success: false,
          message:
            "Hanya IT HelpDesk atau Admin yang dapat memperbarui ticket.",
        };
      }

      const priority =
        body.priority !== undefined
          ? Number(body.priority)
          : undefined;

      if (
        priority !== undefined &&
        ![1, 2, 3, 4].includes(
          priority
        )
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "Priority harus bernilai 1 sampai 4.",
        };
      }

      const allowedStatuses: TicketStatus[] = [
        TicketStatus.ON_GOING,
        TicketStatus.PENDING,
        TicketStatus.COMPLETED,
        TicketStatus.CANCELLED,
      ];

      const status: TicketStatus | undefined =
        body.status
          ? (String(body.status)
            .trim()
            .toUpperCase() as TicketStatus)
          : undefined;

      if (
        status !== undefined &&
        !allowedStatuses.includes(status)
      ) {
        set.status = 400;

        return {
          success: false,
          message: "Status ticket tidak valid.",
        };
      }

      const existingTicket =
        await prisma.ticket.findFirst({
          where: isAdmin
            ? {
              id: ticketId,
            }
            : {
              id: ticketId,
              handlerId: actingUserId,
            },

          select: {
            analisaAwal: true,
            hasilAnalisa: true,
            handlerId: true,
          },
        });

      if (!existingTicket) {
        set.status = 404;

        return {
          success: false,
          message:
            "Ticket tidak ditemukan atau tidak ditugaskan kepada Anda.",
        };
      }

      if (
        isAdmin &&
        !existingTicket.handlerId
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "Ticket belum memiliki handler. Tugaskan handler terlebih dahulu sebelum memperbarui progress.",
        };
      }

      const effectiveHandlerId =
        isAdmin
          ? (existingTicket.handlerId as number)
          : actingUserId;

      const requestAnalisaAwal =
        optionalString(
          body.analisaAwal
        );

      const requestHasilAnalisa =
        optionalString(
          body.hasilAnalisa
        );

      const finalAnalisaAwal =
        requestAnalisaAwal !==
          undefined
          ? requestAnalisaAwal
          : existingTicket.analisaAwal;

      const finalHasilAnalisa =
        requestHasilAnalisa !==
          undefined
          ? requestHasilAnalisa
          : existingTicket.hasilAnalisa;

      if (
        status ===
        TicketStatus.COMPLETED &&
        !finalAnalisaAwal?.trim()
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "Analisa awal wajib diisi sebelum ticket diselesaikan.",
        };
      }

      if (
        status ===
        TicketStatus.COMPLETED &&
        !finalHasilAnalisa?.trim()
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "Hasil analisa wajib diisi sebelum ticket diselesaikan.",
        };
      }

      const ticket =
        await ticketService
          .updateTicketProgress(
            ticketId,
            effectiveHandlerId,
            {
              kategoriKeluhan:
                optionalString(
                  body.kategoriKeluhan
                ),

              priority,

              sla:
                optionalNumber(
                  body.sla
                ),

              eskalasi:
                optionalString(
                  body.eskalasi
                ),

              batasResponse:
                optionalDate(
                  body.batasResponse
                ),

              selesaiResponse:
                optionalString(
                  body.selesaiResponse
                ),

              keteranganResponse:
                optionalString(
                  body.keteranganResponse
                ),

              isPending:
                body.isPending ===
                true,

              lamaPending:
                optionalNumber(
                  body.lamaPending
                ),

              analisaAwal:
                requestAnalisaAwal,

              hasilAnalisa:
                requestHasilAnalisa,

              estimasiPengerjaan:
                optionalDate(
                  body.estimasiPengerjaan
                ),

              selesaiPengerjaan:
                optionalDate(
                  body.selesaiPengerjaan
                ),

              catatan:
                optionalString(
                  body.catatan
                ),

              status,

              keterangan:
                optionalString(
                  body.keterangan
                ),
            }
          );

      return {
        success: true,
        message:
          status ===
            TicketStatus.COMPLETED
            ? "Ticket berhasil diselesaikan."
            : "Progress ticket berhasil diperbarui.",
        ticket,
      };
    } catch (error) {
      console.error(
        "UPDATE TICKET PROGRESS ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Gagal memperbarui ticket.";

      if (
        message.includes(
          "tidak ditemukan"
        )
      ) {
        set.status = 404;
      } else if (
        message.includes(
          "ditangani oleh"
        ) ||
        message.includes(
          "Hanya IT HelpDesk"
        )
      ) {
        set.status = 403;
      } else {
        set.status = 400;
      }

      return {
        success: false,
        message,
      };
    }
  },

  async getItHelpdeskUsers(
    context: any
  ) {
    const {
      user,
      set,
    } = context;

    try {
      const adminId =
        getAuthenticatedUserId(user);

      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: adminId,
          },

          select: {
            isActive: true,

            role: {
              select: {
                name: true,
              },
            },
          },
        });

      const roleName = String(
        currentUser?.role?.name || ""
      )
        .trim()
        .toUpperCase();

      if (
        !currentUser ||
        !currentUser.isActive ||
        !ROLE_GROUPS.ADMIN.includes(roleName)
      ) {
        set.status = 403;

        return {
          success: false,
          message:
            "Hanya Admin yang dapat melihat daftar IT HelpDesk.",
        };
      }

      const users =
        await prisma.user.findMany({
          where: {
            isActive: true,

            role: {
              name: ROLE_NAME_IT_HELPDESK,
            },
          },

          select: {
            id: true,
            email: true,

            employee: {
              select: {
                id: true,
                nik: true,
                nama: true,
                jabatan: true,
                unitKerja: true,
                jobTitle: true,
              },
            },
          },

          orderBy: {
            employee: {
              nama: "asc",
            },
          },
        });

      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error(
        "GET IT HELPDESK USERS ERROR:",
        error
      );

      set.status = 500;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil daftar IT HelpDesk.",
      };
    }
  },


  async getMyTicketDetail(
    context: any
  ) {
    const {
      user,
      params,
      set,
    } = context;

    try {
      const reporterId =
        getAuthenticatedUserId(user);

      const ticketId =
        Number(params.id);

      if (
        Number.isNaN(ticketId) ||
        ticketId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID ticket tidak valid.",
        };
      }

      const ticket =
        await ticketService
          .getMyTicketDetail(
            ticketId,
            reporterId
          );

      return {
        success: true,
        ticket,
      };
    } catch (error) {
      console.error(
        "GET TICKET DETAIL ERROR:",
        error
      );

      set.status = 404;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Ticket tidak ditemukan.",
      };
    }
  },

  async getEvidenceFile(
    context: any
  ) {
    const {
      params,
      user,
      currentUser,
      set,
    } = context;

    try {
      const reporterId =
        getAuthenticatedUserId(user);

      const evidenceId =
        Number(params.evidenceId);

      if (
        Number.isNaN(evidenceId) ||
        evidenceId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID evidence tidak valid.",
        };
      }

      const file =
        await ticketService.getEvidenceFile(
          evidenceId,
          reporterId,
          currentUser?.role?.code ?? null
        );

      set.headers[
        "Content-Type"
      ] = file.mimeType;

      set.headers[
        "Content-Disposition"
      ] =
        `inline; filename="${encodeURIComponent(
          file.fileName
        )}"`;

      return file.buffer;
    } catch (error) {
      console.error(
        "GET EVIDENCE ERROR:",
        error
      );

      set.status = 404;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Evidence tidak ditemukan.",
      };
    }
  },
};