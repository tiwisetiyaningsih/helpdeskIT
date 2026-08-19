import { t } from "elysia";

export const createTicketValidation = {
  body: t.Object({
    keluhan: t.String({
      minLength: 10,
      error: "Keluhan minimal 10 karakter",
    }),
  }),
};

export const updateTicketValidation = {
  params: t.Object({
    id: t.String(),
  }),

  body: t.Object({
    handlerId: t.Optional(t.Nullable(t.Number())),

    kategoriKeluhan: t.Optional(t.Nullable(t.String())),
    sla: t.Optional(t.Nullable(t.String())),
    eskalasi: t.Optional(t.Nullable(t.String())),

    batasResponse: t.Optional(t.Nullable(t.String())),
    selesaiResponse: t.Optional(t.Nullable(t.String())),
    keteranganResponse: t.Optional(t.Nullable(t.String())),

    isPending: t.Optional(t.Boolean()),
    lamaPending: t.Optional(t.Nullable(t.Number())),

    analisaAwal: t.Optional(t.Nullable(t.String())),
    hasilAnalisa: t.Optional(t.Nullable(t.String())),

    mulaiPengerjaan: t.Optional(t.Nullable(t.String())),
    estimasiPengerjaan: t.Optional(t.Nullable(t.String())),
    selesaiPengerjaan: t.Optional(t.Nullable(t.String())),

    catatan: t.Optional(t.Nullable(t.String())),

    status: t.Optional(
      t.Union([
        t.Literal("OPEN"),
        t.Literal("WAITING"),
        t.Literal("IN_PROGRESS"),
        t.Literal("PENDING"),
        t.Literal("COMPLETED"),
        t.Literal("CANCELLED"),
      ]),
    ),

    waktuPengerjaan: t.Optional(t.Nullable(t.Number())),
    keterangan: t.Optional(t.Nullable(t.String())),
  }),
};

export const parseOptionalDate = (
  value?: string | null,
): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Format tanggal tidak valid: ${value}`);
  }

  return date;
};