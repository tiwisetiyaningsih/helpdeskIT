import crypto from "crypto";
import path from "path";

import { TicketStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";
import {
  ensureMinioBucket,
  minioClient,
  MINIO_BUCKET,
} from "../../config/minio";

type CreateTicketInput = {
  reporterId: number;
  keluhan: string;
  priority: number;
  evidence?: File;
};

type AssignTicketByAdminInput = {
  handlerId: number;
  kategoriKeluhan: string;
  priority: number;
  sla: number;
  eskalasi?: string | null;
  batasResponse?: Date | null;
  estimasiPengerjaan?: Date | null;
  selesaiResponse?: string | null;
  keteranganResponse?: string | null;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

async function generateTicketNumber() {
  const now = new Date();

  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = String(
    Math.floor(10000 + Math.random() * 90000)
  );

  return `TKT-${datePart}-${randomPart}`;
}

async function uploadEvidence(
  ticketId: number,
  reporterId: number,
  file: File
) {
  await ensureMinioBucket();

  const safeOriginalName =
    sanitizeFileName(file.name);

  const extension =
    path.extname(safeOriginalName);

  const generatedName =
    `${Date.now()}-${crypto.randomUUID()}${extension}`;

  const objectName =
    `tickets/${ticketId}/${generatedName}`;

  const arrayBuffer =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(arrayBuffer);

  const mimeType =
    file.type ||
    "application/octet-stream";

  await minioClient.putObject(
    MINIO_BUCKET,
    objectName,
    buffer,
    buffer.length,
    {
      "Content-Type": mimeType,
    }
  );

  return prisma.ticketEvidence.create({
    data: {
      ticketId,
      fileName: generatedName,
      originalName: file.name,
      objectName,
      bucketName: MINIO_BUCKET,
      mimeType,
      fileSize: file.size,
      uploadedById: reporterId,
    },
  });
}

const reporterSelect = {
  id: true,
  employeeId: true,
  email: true,
  roleId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,

  employee: true,
  role: true,
};

const handlerSelect = {
  id: true,
  employeeId: true,
  email: true,
  roleId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,

  employee: true,
  role: true,
};

type UpdateTicketProgressInput = {
  kategoriKeluhan?: string | null;
  priority?: number;
  sla?: number | null;
  eskalasi?: string | null;

  batasResponse?: Date | null;
  selesaiResponse?: string | null;
  keteranganResponse?: string | null;

  isPending?: boolean;
  lamaPending?: number | null;

  analisaAwal?: string | null;
  hasilAnalisa?: string | null;

  estimasiPengerjaan?: Date | null;
  selesaiPengerjaan?: Date | null;

  catatan?: string | null;
  status?: TicketStatus;
  keterangan?: string | null;
};

export const ticketService = {
  async create(input: CreateTicketInput) {
    const noPelaporan =
      await generateTicketNumber();

    const ticket =
      await prisma.ticket.create({
        data: {
          noPelaporan,
          reporterId: input.reporterId,
          keluhan: input.keluhan,
          priority: input.priority,
          status: TicketStatus.MASUK,
        },
      });

    try {
      if (input.evidence) {
        await uploadEvidence(
          ticket.id,
          input.reporterId,
          input.evidence
        );
      }
    } catch (error) {
      await prisma.ticket.delete({
        where: {
          id: ticket.id,
        },
      });

      throw error;
    }

    return prisma.ticket.findUnique({
      where: {
        id: ticket.id,
      },

      include: {
        reporter: {
          select: reporterSelect,
        },

        handler: {
          select: handlerSelect,
        },

        evidences: true,
      },
    });
  },

  async getAllTickets() {
    const tickets = await prisma.ticket.findMany({
      orderBy: [
        { priority: "asc" },
        { waktuKeluhan: "asc" },
      ],

      include: {
        reporter: { select: reporterSelect },
        handler: { select: handlerSelect },
        evidences: true,
      },
    });

    return tickets.map((ticket) => ({
      ...ticket,
      evidences: ticket.evidences.map((evidence) => ({
        id: evidence.id,
        ticketId: evidence.ticketId,
        fileName: evidence.fileName,
        originalName: evidence.originalName,
        objectName: evidence.objectName,
        bucketName: evidence.bucketName,
        mimeType: evidence.mimeType,
        fileSize: evidence.fileSize,
        uploadedById: evidence.uploadedById,
        createdAt: evidence.createdAt,
        fileUrl: `http://localhost:3001/tickets/evidences/${evidence.id}`,
      })),
    }));
  },

  async assignTicketByAdmin(
    ticketId: number,
    input: AssignTicketByAdminInput
  ) {
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },

      select: {
        id: true,
        status: true,
        priority: true,
        waktuKeluhan: true,
        lamaPending: true,
        handlerId: true,
      },
    });

    if (!ticket) {
      throw new Error("Ticket tidak ditemukan.");
    }

    if (ticket.status !== TicketStatus.MASUK) {
      throw new Error(
        "Hanya ticket berstatus MASUK yang dapat ditugaskan."
      );
    }

    if (ticket.handlerId) {
      throw new Error(
        "Ticket sudah memiliki IT HelpDesk."
      );
    }

    const kategoriKeluhan =
      input.kategoriKeluhan.trim();

    if (!kategoriKeluhan) {
      throw new Error(
        "Kategori keluhan wajib dipilih."
      );
    }

    const kategoriValid = [
      "Jaringan",
      "Aplikasi",
      "Data Center",
      "Printer",
      "Laptop/PC",
      "Email",
      "Layanan",
    ];

    if (!kategoriValid.includes(kategoriKeluhan)) {
      throw new Error(
        "Kategori keluhan tidak valid."
      );
    }

    if (
      !Number.isInteger(input.sla) ||
      input.sla <= 0
    ) {
      throw new Error(
        "SLA harus berupa jumlah jam lebih dari 0."
      );
    }

    const handler = await prisma.user.findFirst({
      where: {
        id: input.handlerId,
        isActive: true,

        role: {
          name: {
            in: [
              "IT HelpDesk",
              "IT HELPDESK",
              "IT Help Desk",
            ],
          },
        },
      },

      select: {
        id: true,
        email: true,

        employee: {
          select: {
            nama: true,
            nik: true,
            jabatan: true,
            unitKerja: true,
            jobTitle: true,
          },
        },
      },
    });

    if (!handler) {
      throw new Error(
        "IT HelpDesk yang dipilih tidak valid atau sedang tidak aktif."
      );
    }

    /*
     * Eskalasi otomatis mengambil nama IT HelpDesk
     * yang dipilih oleh admin.
     */
    const eskalasi =
      handler.employee?.nama ||
      handler.email ||
      `User ${handler.id}`;

    /*
     * SLA disimpan dalam jam.
     */
    const slaMilliseconds =
      input.sla * 60 * 60 * 1000;

    /*
     * Lama pending diasumsikan dalam menit.
     * Saat baru ditugaskan nilainya biasanya 0.
     */
    const lamaPendingMinutes =
      ticket.lamaPending ?? 0;

    const pendingMilliseconds =
      lamaPendingMinutes * 60 * 1000;

    /*
     * Batas Response:
     * waktu keluhan + SLA
     */
    const batasResponse = new Date(
      ticket.waktuKeluhan.getTime() +
      slaMilliseconds
    );

    /*
     * Estimasi Pengerjaan:
     * waktu keluhan + SLA + lama pending
     */
    const estimasiPengerjaan = new Date(
      ticket.waktuKeluhan.getTime() +
      slaMilliseconds +
      pendingMilliseconds
    );

    return prisma.ticket.update({
      where: {
        id: ticketId,
      },

      data: {
        handlerId: handler.id,

        kategoriKeluhan,

        /*
         * Priority tidak diubah karena sudah
         * dihitung otomatis ketika ticket dibuat.
         */
        priority: ticket.priority,

        sla: input.sla,

        /*
         * Eskalasi otomatis berisi petugas IT.
         */
        eskalasi,

        batasResponse,
        estimasiPengerjaan,

        selesaiResponse:
          input.selesaiResponse?.trim() ||
          null,

        keteranganResponse:
          input.keteranganResponse?.trim() ||
          null,

        status: TicketStatus.OPEN,

        isPending: false,
        lamaPending: ticket.lamaPending ?? 0,
      },

      include: {
        reporter: {
          select: reporterSelect,
        },

        handler: {
          select: handlerSelect,
        },

        evidences: true,
      },
    });
  },

  async getTicketDetail(ticketId: number) {
    const ticket =
      await prisma.ticket.findUnique({
        where: {
          id: ticketId,
        },

        include: {
          reporter: {
            select: reporterSelect,
          },

          handler: {
            select: handlerSelect,
          },

          evidences: true,
        },
      });

    if (!ticket) {
      throw new Error(
        "Ticket tidak ditemukan."
      );
    }

    const evidences =
      ticket.evidences.map(
        (evidence) => ({
          id: evidence.id,
          ticketId: evidence.ticketId,
          fileName: evidence.fileName,
          originalName:
            evidence.originalName,
          objectName:
            evidence.objectName,
          bucketName:
            evidence.bucketName,
          mimeType:
            evidence.mimeType,
          fileSize:
            evidence.fileSize,
          uploadedById:
            evidence.uploadedById,
          createdAt:
            evidence.createdAt,

          fileUrl:
            `http://localhost:3001/tickets/evidences/${evidence.id}`,
        })
      );

    return {
      ...ticket,
      evidences,
    };
  },

  async startTicketWork(
    ticketId: number,
    handlerId: number
  ) {
    const ticket =
      await prisma.ticket.findUnique({
        where: {
          id: ticketId,
        },

        select: {
          id: true,
          handlerId: true,
          status: true,
          mulaiPengerjaan: true,
        },
      });

    if (!ticket) {
      throw new Error(
        "Ticket tidak ditemukan."
      );
    }

    if (!ticket.handlerId) {
      throw new Error(
        "Ticket belum ditugaskan oleh admin."
      );
    }

    if (
      ticket.handlerId !== handlerId
    ) {
      throw new Error(
        "Ticket ini ditugaskan kepada IT HelpDesk lain."
      );
    }

    if (
      ticket.status !==
      TicketStatus.OPEN
    ) {
      throw new Error(
        "Hanya ticket berstatus OPEN yang dapat mulai dikerjakan."
      );
    }

    return prisma.ticket.update({
      where: {
        id: ticketId,
      },

      data: {
        status:
          TicketStatus.ON_GOING,

        mulaiPengerjaan:
          ticket.mulaiPengerjaan ||
          new Date(),

        isPending: false,
        lamaPending: null,
      },

      include: {
        reporter: {
          select: reporterSelect,
        },

        handler: {
          select: handlerSelect,
        },

        evidences: true,
      },
    });
  },

  async updateTicketProgress(
    ticketId: number,
    handlerId: number,
    input: UpdateTicketProgressInput
  ) {
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },

      select: {
        id: true,
        handlerId: true,
        status: true,
        mulaiPengerjaan: true,
      },
    });

    if (!ticket) {
      throw new Error("Ticket tidak ditemukan.");
    }

    if (!ticket.handlerId) {
      throw new Error(
        "Ticket belum diambil oleh IT HelpDesk."
      );
    }

    if (ticket.handlerId !== handlerId) {
      throw new Error(
        "Ticket ini sedang ditangani oleh IT HelpDesk lain."
      );
    }

    if (ticket.status === TicketStatus.COMPLETED) {
      throw new Error(
        "Ticket yang sudah selesai tidak dapat diperbarui."
      );
    }

    const status =
      input.status || ticket.status;

    const isCompleted =
      status === TicketStatus.COMPLETED;

    const isPending =
      status === TicketStatus.PENDING ||
      input.isPending === true;

    return prisma.ticket.update({
      where: {
        id: ticketId,
      },

      data: {
        kategoriKeluhan:
          input.kategoriKeluhan,

        priority:
          input.priority,

        sla:
          input.sla,

        eskalasi:
          input.eskalasi,

        batasResponse:
          input.batasResponse,

        selesaiResponse:
          input.selesaiResponse,

        keteranganResponse:
          input.keteranganResponse,

        isPending,

        lamaPending: isPending
          ? input.lamaPending
          : null,

        analisaAwal:
          input.analisaAwal,

        hasilAnalisa:
          input.hasilAnalisa,

        mulaiPengerjaan:
          ticket.mulaiPengerjaan ||
          new Date(),

        estimasiPengerjaan:
          input.estimasiPengerjaan,

        selesaiPengerjaan:
          isCompleted
            ? input.selesaiPengerjaan ||
            new Date()
            : input.selesaiPengerjaan,

        catatan:
          input.catatan,

        status,

        keterangan:
          input.keterangan,
      },

      include: {
        reporter: {
          select: reporterSelect,
        },

        handler: {
          select: handlerSelect,
        },

        evidences: true,
      },
    });
  },


  async getMyTickets(
    reporterId: number
  ) {
    const tickets = await prisma.ticket.findMany({
      where: {
        reporterId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        reporter: {
          select: reporterSelect,
        },

        handler: {
          select: handlerSelect,
        },

        evidences: true,
      },
    });

    return tickets.map((ticket) => ({
      ...ticket,
      evidences: ticket.evidences.map((evidence) => ({
        id: evidence.id,
        ticketId: evidence.ticketId,
        fileName: evidence.fileName,
        originalName: evidence.originalName,
        objectName: evidence.objectName,
        bucketName: evidence.bucketName,
        mimeType: evidence.mimeType,
        fileSize: evidence.fileSize,
        uploadedById: evidence.uploadedById,
        createdAt: evidence.createdAt,
        fileUrl: `http://localhost:3001/tickets/evidences/${evidence.id}`,
      })),
    }));
  },

  async getMyTicketDetail(
    ticketId: number,
    reporterId: number
  ) {
    const ticket =
      await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          reporterId,
        },

        include: {
          reporter: {
            select: reporterSelect,
          },

          handler: {
            select: handlerSelect,
          },

          evidences: true,
        },
      });

    if (!ticket) {
      throw new Error(
        "Ticket tidak ditemukan."
      );
    }

    const evidences =
      ticket.evidences.map(
        (evidence) => ({
          id: evidence.id,
          ticketId: evidence.ticketId,
          fileName: evidence.fileName,
          originalName:
            evidence.originalName,
          objectName:
            evidence.objectName,
          bucketName:
            evidence.bucketName,
          mimeType: evidence.mimeType,
          fileSize: evidence.fileSize,
          uploadedById:
            evidence.uploadedById,
          createdAt:
            evidence.createdAt,

          fileUrl:
            `http://localhost:3001/tickets/evidences/${evidence.id}`,
        })
      );

    return {
      ...ticket,
      evidences,
    };
  },

  async getEvidenceFile(
    evidenceId: number,
    userId: number
  ) {
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
      throw new Error(
        "Pengguna tidak ditemukan."
      );
    }

    const roleName = String(
      currentUser.role?.name || ""
    )
      .trim()
      .toUpperCase();

    const isPrivilegedUser = [
      "ADMIN",
      "IT HELPDESK",
      "IT HELP DESK",
    ].includes(roleName);

    const evidence =
      await prisma.ticketEvidence.findFirst({
        where: {
          id: evidenceId,

          ...(isPrivilegedUser
            ? {}
            : {
              ticket: {
                reporterId: userId,
              },
            }),
        },
      });

    if (!evidence) {
      throw new Error(
        "Evidence tidak ditemukan atau tidak dapat diakses."
      );
    }

    const stream =
      await minioClient.getObject(
        evidence.bucketName,
        evidence.objectName
      );

    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(
        Buffer.from(chunk)
      );
    }

    return {
      buffer:
        Buffer.concat(chunks),

      mimeType:
        evidence.mimeType ||
        "application/octet-stream",

      fileName:
        evidence.originalName,
    };
  },
};