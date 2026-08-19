import { prisma } from "../../config/prisma";

const DEFAULT_ROLES = [
  "ADMIN",
  "IT HELPDESK",
  "EMPLOYEE",
];

function normalizeRoleName(name: string) {
  return name.trim().toUpperCase();
}

export const roleService = {
  async getAll() {
    const roles = await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },

      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,

      userCount: role._count.users,

      isDefault: DEFAULT_ROLES.includes(
        normalizeRoleName(role.name)
      ),
    }));
  },

  async getById(roleId: number) {
    const role = await prisma.role.findUnique({
      where: {
        id: roleId,
      },

      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error("Role tidak ditemukan.");
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,

      userCount: role._count.users,

      isDefault: DEFAULT_ROLES.includes(
        normalizeRoleName(role.name)
      ),
    };
  },

  async create(input: {
    name: string;
    description?: string | null;
  }) {
    const name = input.name.trim();

    if (!name) {
      throw new Error("Nama role wajib diisi.");
    }

    const existingRole =
      await prisma.role.findFirst({
        where: {
          name: {
            equals: name,
          },
        },
      });

    if (existingRole) {
      throw new Error(
        "Nama role sudah digunakan."
      );
    }

    return prisma.role.create({
      data: {
        name,
        description:
          input.description?.trim() || null,
      },
    });
  },

  async update(
    roleId: number,
    input: {
      name: string;
      description?: string | null;
    }
  ) {
    const currentRole =
      await prisma.role.findUnique({
        where: {
          id: roleId,
        },
      });

    if (!currentRole) {
      throw new Error("Role tidak ditemukan.");
    }

    const name = input.name.trim();

    if (!name) {
      throw new Error("Nama role wajib diisi.");
    }

    const duplicateRole =
      await prisma.role.findFirst({
        where: {
          name: {
            equals: name,
          },

          NOT: {
            id: roleId,
          },
        },
      });

    if (duplicateRole) {
      throw new Error(
        "Nama role sudah digunakan."
      );
    }

    /*
     * Nama role bawaan tidak boleh diganti karena
     * saat ini hak akses masih diperiksa berdasarkan
     * nama role pada backend dan frontend.
     */
    const isDefaultRole =
      DEFAULT_ROLES.includes(
        normalizeRoleName(currentRole.name)
      );

    if (
      isDefaultRole &&
      normalizeRoleName(name) !==
        normalizeRoleName(currentRole.name)
    ) {
      throw new Error(
        "Nama role bawaan tidak dapat diubah. Anda hanya dapat mengubah deskripsinya."
      );
    }

    return prisma.role.update({
      where: {
        id: roleId,
      },

      data: {
        name,
        description:
          input.description?.trim() || null,
      },
    });
  },

  async remove(roleId: number) {
    const role = await prisma.role.findUnique({
      where: {
        id: roleId,
      },

      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new Error("Role tidak ditemukan.");
    }

    if (
      DEFAULT_ROLES.includes(
        normalizeRoleName(role.name)
      )
    ) {
      throw new Error(
        "Role bawaan sistem tidak dapat dihapus."
      );
    }

    if (role._count.users > 0) {
      throw new Error(
        "Role tidak dapat dihapus karena masih digunakan oleh user."
      );
    }

    await prisma.role.delete({
      where: {
        id: roleId,
      },
    });

    return {
      id: role.id,
      name: role.name,
    };
  },
};