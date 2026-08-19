import { prisma } from "../../config/prisma";

export const authRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        employee: true,
        role: true,
      },
    });
  },

  async findById(id: number) {
    return prisma.user.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        employee: true,
        role: true,
      },
    });
  },

  async findEmployeeByNik(nik: string) {
    return prisma.employee.findUnique({
      where: {
        nik,
      },
      include: {
        user: true,
      },
    });
  },

  async findRoleByName(name: string) {
    return prisma.role.findUnique({
      where: {
        name,
      },
    });
  },

  async createUser(data: {
    employeeId: number;
    email: string;
    password: string;
    roleId: number;
  }) {
    return prisma.user.create({
      data: {
        employeeId: data.employeeId,
        email: data.email,
        password: data.password,
        roleId: data.roleId,
      },
      include: {
        employee: true,
        role: true,
      },
    });
  },

  async createRefreshToken(data: { token: string; userId: number; expiresAt: Date }) {
  return prisma.refreshToken.create({ data });
},
 
async findRefreshToken(hashedToken: string) {
  return prisma.refreshToken.findUnique({ where: { token: hashedToken } });
},
 
/** Rotasi atomik: token lama dimatikan + token baru dibuat, dalam satu transaksi */
async rotateRefreshToken(
  oldTokenId: string,
  newToken: { token: string; userId: number; expiresAt: Date }
) {
  return prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: oldTokenId },
      data: { revokedAt: new Date(), replacedByToken: newToken.token },
    }),
    prisma.refreshToken.create({ data: newToken }),
  ]);
},
 
async revokeRefreshToken(id: string) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
},
 
async revokeAllUserRefreshTokens(userId: number) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
},
};