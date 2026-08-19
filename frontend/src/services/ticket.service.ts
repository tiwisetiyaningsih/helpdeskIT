import { apiFetch } from "@/lib/apiFetch";

export type TicketEmployee = {
  id: number;
  nik: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jobTitle?: string | null;
};

export type TicketUser = {
  id: number;
  email: string;
  employee?: TicketEmployee | null;
};

export type TicketEvidence = {
  id: number;
  ticketId: number;

  fileName: string;
  originalName: string;

  objectName: string;
  bucketName: string;

  mimeType: string;
  fileSize: number;

  uploadedById?: number | null;
  createdAt: string;

  fileUrl?: string;
};

export type Ticket = {
  id: number;
  noPelaporan: string;

  reporterId: number;
  handlerId: number | null;

  keluhan: string;
  priority: number;

  waktuKeluhan: string;

  kategoriKeluhan: string | null;
  sla: string | number | null;
  eskalasi: string | null;

  batasResponse: string | null;
  selesaiResponse: string | null;
  keteranganResponse: string | null;

  isPending: boolean;
  lamaPending: number | null;

  analisaAwal: string | null;
  hasilAnalisa: string | null;

  mulaiPengerjaan: string | null;
  estimasiPengerjaan: string | null;
  selesaiPengerjaan: string | null;

  catatan: string | null;
  status:
  | "MASUK"
  | "OPEN"
  | "ON_GOING"
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED";

  waktuPengerjaan: number | null;
  keterangan: string | null;

  createdAt: string;
  updatedAt: string;

  reporter?: TicketUser | null;
  handler?: TicketUser | null;

  /*
   * Field hasil normalisasi.
   * Diambil dari reporter.employee agar mudah
   * digunakan pada tabel admin.
   */
  employee: TicketEmployee | null;

  evidences?: TicketEvidence[];
};

type TicketApiData = Omit<Ticket, "employee"> & {
  reporter?: TicketUser | null;
};

type GetTicketsResponse = {
  success?: boolean;
  message?: string;
  tickets?: TicketApiData[];
};

async function parseJsonResponse<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const responseText = await response.text();

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

export async function getTickets(): Promise<Ticket[]> {
  const response = await apiFetch("/tickets", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data =
    await parseJsonResponse<GetTicketsResponse>(
      response
    );

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
      "Gagal mengambil data tiket."
    );
  }

  const tickets = data.tickets || [];

  return tickets.map((ticket) => {
    const employee =
      ticket.reporter?.employee;

    return {
      ...ticket,

      employee: employee || {
        id: 0,
        nik: "-",
        nama: "Data karyawan tidak tersedia",
        jabatan: "-",
        unitKerja: "-",
        jobTitle: null,
      },
    };
  });
}