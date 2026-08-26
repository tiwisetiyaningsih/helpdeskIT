const FILE_SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

export const ALLOWED_EVIDENCE_MIME_TYPES = FILE_SIGNATURES.map((s) => s.mime);

export const MAX_EVIDENCE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function detectRealMimeType(buffer: Buffer): string | null {
  for (const signature of FILE_SIGNATURES) {
    const matches = signature.bytes.every(
      (byte, index) => buffer[index] === byte
    );
    if (matches) {
      return signature.mime;
    }
  }
  return null;
}