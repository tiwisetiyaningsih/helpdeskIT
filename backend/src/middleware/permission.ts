import { Elysia } from "elysia";

export function requireRole(...allowedRoles: string[]) {
  return new Elysia().onBeforeHandle(({ store, set }: any) => {
    // dipakai setelah authMiddleware, jadi store punya session
  });
}

// Cara pakai lebih simpel: helper function untuk dipanggil manual di controller/route
export function assertRole(userRole: string, allowedRoles: string[]) {
  if (!allowedRoles.includes(userRole)) {
    throw new Error("Anda tidak memiliki akses untuk aksi ini");
  }
}