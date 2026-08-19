import type { TicketStatus } from "@prisma/client";

export interface CreateTicketRepositoryData {
  noPelaporan: string;
  reporterId: number;
  keluhan: string;
  priority: number;
}

export interface UpdateTicketRepositoryData {
  handlerId?: number | null;

  kategoriKeluhan?: string | null;
  sla?: number | null;
  eskalasi?: string | null;

  batasResponse?: Date | null;
  selesaiResponse?: string | null;
  keteranganResponse?: string | null;

  isPending?: boolean;
  lamaPending?: number | null;

  analisaAwal?: string | null;
  hasilAnalisa?: string | null;

  mulaiPengerjaan?: Date | null;
  estimasiPengerjaan?: Date | null;
  selesaiPengerjaan?: Date | null;

  catatan?: string | null;
  status?: TicketStatus;

  waktuPengerjaan?: number | null;
  keterangan?: string | null;
}

export interface CreateTicketEvidenceRepositoryData {
  ticketId: number;
  fileName: string;
  originalName: string;
  objectName: string;
  bucketName: string;
  mimeType: string;
  fileSize: number;
  uploadedById?: number | null;
}