import { prisma } from "../../config/prisma";
import type {
  CreateTicketEvidenceRepositoryData,
  CreateTicketRepositoryData,
  UpdateTicketRepositoryData,
} from "./ticket.type";

export const ticketRepository = {
  async findUserById(userId: number) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        employee: true,
        role: true,
      },
    });
  },
  
  async findAll() {
    return prisma.ticket.findMany({
      include: {
        reporter: {
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
        },

        handler: {
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
              },
            },
          },
        },

        evidences: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },

      orderBy: [
        {
          priority: "asc",
        },
        {
          waktuKeluhan: "asc",
        },
      ],
    });
  },

  async findById(id: number) {
    return prisma.ticket.findUnique({
      where: {
        id,
      },
      include: {
        reporter: {
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
        },

        handler: {
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
              },
            },
          },
        },

        evidences: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  },

  async findByReporterId(reporterId: number) {
    return prisma.ticket.findMany({
      where: {
        reporterId,
      },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            employee: {
              select: {
                nik: true,
                nama: true,
                jabatan: true,
                unitKerja: true,
              },
            },
          },
        },

        handler: {
          select: {
            id: true,
            email: true,
            employee: {
              select: {
                nik: true,
                nama: true,
                jabatan: true,
                unitKerja: true,
              },
            },
          },
        },

        evidences: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },

      orderBy: [
        {
          priority: "asc",
        },
        {
          waktuKeluhan: "asc",
        },
      ],
    });
  },

  async create(data: CreateTicketRepositoryData) {
    return prisma.ticket.create({
      data: {
        noPelaporan: data.noPelaporan,
        keluhan: data.keluhan,
        priority: data.priority,

        reporter: {
          connect: {
            id: data.reporterId,
          },
        },
      },

      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            employee: {
              select: {
                nik: true,
                nama: true,
                jabatan: true,
                unitKerja: true,
                jobTitle: true,
              },
            },
          },
        },
      },
    });
  },

  async update(id: number, data: UpdateTicketRepositoryData) {
    return prisma.ticket.update({
      where: {
        id,
      },

      data: {
        handlerId: data.handlerId,

        kategoriKeluhan: data.kategoriKeluhan,
        sla: data.sla,
        eskalasi: data.eskalasi,

        batasResponse: data.batasResponse,
        selesaiResponse: data.selesaiResponse,
        keteranganResponse: data.keteranganResponse,

        isPending: data.isPending,
        lamaPending: data.lamaPending,

        analisaAwal: data.analisaAwal,
        hasilAnalisa: data.hasilAnalisa,

        mulaiPengerjaan: data.mulaiPengerjaan,
        estimasiPengerjaan: data.estimasiPengerjaan,
        selesaiPengerjaan: data.selesaiPengerjaan,

        catatan: data.catatan,
        status: data.status,

        waktuPengerjaan: data.waktuPengerjaan,
        keterangan: data.keterangan,
      },

      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            employee: {
              select: {
                nik: true,
                nama: true,
                jabatan: true,
                unitKerja: true,
              },
            },
          },
        },

        handler: {
          select: {
            id: true,
            email: true,
            employee: {
              select: {
                nik: true,
                nama: true,
                jabatan: true,
                unitKerja: true,
              },
            },
          },
        },

        evidences: true,
      },
    });
  },

  async createEvidence(data: CreateTicketEvidenceRepositoryData) {
    return prisma.ticketEvidence.create({
      data: {
        ticketId: data.ticketId,
        fileName: data.fileName,
        originalName: data.originalName,
        objectName: data.objectName,
        bucketName: data.bucketName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        uploadedById: data.uploadedById,
      },
    });
  },

  async findEvidenceById(id: number) {
    return prisma.ticketEvidence.findUnique({
      where: {
        id,
      },
      include: {
        ticket: true,
        uploadedBy: {
          select: {
            id: true,
            email: true,
            employee: {
              select: {
                nama: true,
                nik: true,
              },
            },
          },
        },
      },
    });
  },

  async deleteEvidence(id: number) {
    return prisma.ticketEvidence.delete({
      where: {
        id,
      },
    });
  },
};