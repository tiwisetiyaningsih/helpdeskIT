import { prisma } from "../../config/prisma";
import { authRepository } from "../auth/auth.repository";

type CreateUserInput = {
  employeeId: number;
  email: string;
  password: string;
  roleId: number;
  isActive?: boolean;
};
type UpdateUserInput = {
  employeeId?: number;
  email?: string;
  password?: string;
  roleId?: number;
  isActive?: boolean;
};
export const userService = {
  async getAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        email: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            nik: true,
            nama: true,
            jabatan: true,
            unitKerja: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
  async getById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        email: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            nik: true,
            nama: true,
            jabatan: true,
            unitKerja: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },
  async getFormOptions() {
    const [employees, roles] = await Promise.all([
      prisma.employee.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          nik: true,
          nama: true,
          jabatan: true,
          unitKerja: true,
          user: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          nama: "asc",
        },
      }),
      prisma.role.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);
    return {
      employees,
      roles,
    };
  },
  async create(data: CreateUserInput) {
    const employee = await prisma.employee.findUnique({
      where: {
        id: data.employeeId,
      },
    });
    if (!employee) {
      throw new Error("Employee tidak ditemukan.");
    }
    const employeeUser = await prisma.user.findUnique({
      where: {
        employeeId: data.employeeId,
      },
    });
    if (employeeUser) {
      throw new Error("Employee tersebut sudah memiliki akun user.");
    }
    const emailExists = await prisma.user.findUnique({
      where: {
        email: data.email.toLowerCase().trim(),
      },
    });
    if (emailExists) {
      throw new Error("Email sudah digunakan.");
    }
    const role = await prisma.role.findUnique({
      where: {
        id: data.roleId,
      },
    });
    if (!role) {
      throw new Error("Role tidak ditemukan.");
    }
    const hashedPassword = await Bun.password.hash(data.password, {
      algorithm: "bcrypt",
      cost: 10,
    });
    return prisma.user.create({
      data: {
        employeeId: data.employeeId,
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        roleId: data.roleId,
        isActive: data.isActive ?? true,
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        roleId: true,
        isActive: true,
        employee: {
          select: {
            id: true,
            nik: true,
            nama: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },
  async update(id: number, data: UpdateUserInput) {
    const currentUser = await prisma.user.findUnique({
      where: { id },
    });
    if (!currentUser) {
      throw new Error("User tidak ditemukan.");
    }
    if (
      data.employeeId !== undefined &&
      data.employeeId !== currentUser.employeeId
    ) {
      const employee = await prisma.employee.findUnique({
        where: {
          id: data.employeeId,
        },
      });
      if (!employee) {
        throw new Error("Employee tidak ditemukan.");
      }
      const employeeUser = await prisma.user.findUnique({
        where: {
          employeeId: data.employeeId,
        },
      });
      if (employeeUser && employeeUser.id !== id) {
        throw new Error("Employee tersebut sudah memiliki akun user.");
      }
    }
    if (data.email !== undefined) {
      const normalizedEmail = data.email.toLowerCase().trim();
      const emailExists = await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });
      if (emailExists && emailExists.id !== id) {
        throw new Error("Email sudah digunakan.");
      }
    }
    if (data.roleId !== undefined) {
      const role = await prisma.role.findUnique({
        where: {
          id: data.roleId,
        },
      });
      if (!role) {
        throw new Error("Role tidak ditemukan.");
      }
    }
    let hashedPassword: string | undefined;
    if (data.password?.trim()) {
      hashedPassword = await Bun.password.hash(data.password, {
        algorithm: "bcrypt",
        cost: 10,
      });
    }
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        employeeId: data.employeeId,
        email:
          data.email !== undefined
            ? data.email.toLowerCase().trim()
            : undefined,
        password: hashedPassword,
        roleId: data.roleId,
        isActive: data.isActive,
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        roleId: true,
        isActive: true,
        employee: {
          select: {
            id: true,
            nik: true,
            nama: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (hashedPassword || data.isActive === false) {
      await authRepository.revokeAllUserRefreshTokens(id);
    }

    return updatedUser;
  },
  async delete(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new Error("User tidak ditemukan.");
    }
    await prisma.user.delete({
      where: { id },
    });
    return user;
  },
};