export const generateTicketNumber = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.floor(Math.random() * 90000) + 10000;

  return `TKT-${year}${month}${day}-${random}`;
};

export const getPriorityByJabatan = (jabatan: string): number => {
  const text = jabatan.toLowerCase();

  if (text.includes("direktur")) return 1;
  if (text.includes("direksi")) return 1;

  if (text.includes("vp")) return 2;
  if (text.includes("evp")) return 2;

  if (text.includes("manager")) return 3;

  return 4;
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