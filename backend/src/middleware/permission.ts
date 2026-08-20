import { prisma } from "../config/prisma";

type AuthenticatedUser = {
  id?: number | string;
  userId?: number | string;
};

function getAuthenticatedUserId(user: AuthenticatedUser | undefined) {
  const rawId = user?.id ?? user?.userId;
  const userId = Number(rawId);

  if (!rawId || Number.isNaN(userId)) {
    throw new Error("Data pengguna login tidak valid.");
  }

  return userId;
}

export async function ensureRole(
  user: AuthenticatedUser | undefined,
  allowedRoles: string[]
) {
  const userId = getAuthenticatedUserId(user);

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isActive: true,
      role: { select: { name: true } },
    },
  });

  if (!currentUser) {
    throw new Error("Pengguna tidak ditemukan.");
  }

  if (!currentUser.isActive) {
    throw new Error("Akun pengguna sedang tidak aktif.");
  }

  const roleName = String(currentUser.role?.name || "")
    .trim()
    .toUpperCase();

  const normalizedAllowed = allowedRoles.map((role) =>
    role.trim().toUpperCase()
  );

  if (!normalizedAllowed.includes(roleName)) {
    throw new Error("Anda tidak memiliki akses untuk aksi ini.");
  }

  return currentUser;
}

/** Konversi pesan Error dari ensureRole() menjadi HTTP status yang sesuai. */
export function getRoleErrorStatus(message: string) {
  if (
    message.includes("tidak memiliki akses") ||
    message.includes("tidak aktif")
  ) {
    return 403;
  }

  if (message.includes("tidak ditemukan")) {
    return 404;
  }

  return 500;
}