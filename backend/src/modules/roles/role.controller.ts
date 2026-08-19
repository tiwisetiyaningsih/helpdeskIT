import { prisma } from "../../config/prisma";
import { roleService } from "./role.service";

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

async function ensureAdmin(
  user: AuthenticatedUser | undefined
) {
  const userId =
    getAuthenticatedUserId(user);

  const currentUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
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
    throw new Error(
      "Pengguna tidak ditemukan."
    );
  }

  if (!currentUser.isActive) {
    throw new Error(
      "Akun pengguna sedang tidak aktif."
    );
  }

  const roleName = String(
    currentUser.role?.name || ""
  )
    .trim()
    .toUpperCase();

  if (
    ![
      "ADMIN",
      "ADMINISTRATOR",
    ].includes(roleName)
  ) {
    throw new Error(
      "Hanya Admin yang dapat mengelola role."
    );
  }

  return currentUser;
}

function getErrorStatus(message: string) {
  if (
    message.includes("Hanya Admin") ||
    message.includes("tidak aktif")
  ) {
    return 403;
  }

  if (
    message.includes("tidak ditemukan")
  ) {
    return 404;
  }

  if (
    message.includes("sudah digunakan") ||
    message.includes("tidak dapat") ||
    message.includes("wajib")
  ) {
    return 400;
  }

  return 500;
}

export const roleController = {
  async getAll(context: any) {
    const { user, set } = context;

    try {
      await ensureAdmin(user);

      const roles =
        await roleService.getAll();

      return {
        success: true,
        roles,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil data role.";

      console.error(
        "GET ROLES ERROR:",
        error
      );

      set.status =
        getErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async getById(context: any) {
    const {
      user,
      params,
      set,
    } = context;

    try {
      await ensureAdmin(user);

      const roleId =
        Number(params.id);

      if (
        Number.isNaN(roleId) ||
        roleId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID role tidak valid.",
        };
      }

      const role =
        await roleService.getById(
          roleId
        );

      return {
        success: true,
        role,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail role.";

      console.error(
        "GET ROLE DETAIL ERROR:",
        error
      );

      set.status =
        getErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async create(context: any) {
    const {
      user,
      body,
      set,
    } = context;

    try {
      await ensureAdmin(user);

      const role =
        await roleService.create({
          name: String(
            body.name || ""
          ),

          description:
            body.description
              ? String(
                  body.description
                )
              : null,
        });

      set.status = 201;

      return {
        success: true,
        message:
          "Role berhasil ditambahkan.",
        role,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menambahkan role.";

      console.error(
        "CREATE ROLE ERROR:",
        error
      );

      set.status =
        getErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async update(context: any) {
    const {
      user,
      params,
      body,
      set,
    } = context;

    try {
      await ensureAdmin(user);

      const roleId =
        Number(params.id);

      if (
        Number.isNaN(roleId) ||
        roleId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID role tidak valid.",
        };
      }

      const role =
        await roleService.update(
          roleId,
          {
            name: String(
              body.name || ""
            ),

            description:
              body.description
                ? String(
                    body.description
                  )
                : null,
          }
        );

      return {
        success: true,
        message:
          "Role berhasil diperbarui.",
        role,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal memperbarui role.";

      console.error(
        "UPDATE ROLE ERROR:",
        error
      );

      set.status =
        getErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async remove(context: any) {
    const {
      user,
      params,
      set,
    } = context;

    try {
      await ensureAdmin(user);

      const roleId =
        Number(params.id);

      if (
        Number.isNaN(roleId) ||
        roleId <= 0
      ) {
        set.status = 400;

        return {
          success: false,
          message:
            "ID role tidak valid.",
        };
      }

      const role =
        await roleService.remove(
          roleId
        );

      return {
        success: true,
        message:
          "Role berhasil dihapus.",
        role,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menghapus role.";

      console.error(
        "DELETE ROLE ERROR:",
        error
      );

      set.status =
        getErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },
};