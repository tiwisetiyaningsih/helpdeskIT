import { Elysia } from "elysia";
import { prisma } from "../config/prisma";

type JwtPayload = {
  id: number;
  email: string;
  role: string;
  iat?: number;
};

export const authMiddleware = new Elysia()
  .derive({ as: "scoped" }, async (context: any) => {
    const { jwt, headers } = context;
    const authorization = headers.authorization;

    if (!authorization) {
      return {
        user: null,
        currentUser: null,
        authErrorStatus: 401,
        authErrorMessage: "Token tidak ditemukan",
      };
    }

    if (!authorization.startsWith("Bearer ")) {
      return {
        user: null,
        currentUser: null,
        authErrorStatus: 401,
        authErrorMessage: "Format token tidak valid",
      };
    }

    const token = authorization.substring(7);
    const payload = (await jwt.verify(token)) as JwtPayload | false;

    if (!payload) {
      return {
        user: null,
        currentUser: null,
        authErrorStatus: 401,
        authErrorMessage: "Token tidak valid atau sudah kedaluwarsa",
      };
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: Number(payload.id),
      },
      select: {
        id: true,
        email: true,
        roleId: true,
        isActive: true,
        tokenValidAfter: true,
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!currentUser) {
      return {
        user: null,
        currentUser: null,
        authErrorStatus: 401,
        authErrorMessage: "Sesi pengguna tidak valid",
      };
    }

    if (!currentUser.isActive) {
      return {
        user: null,
        currentUser: null,
        authErrorStatus: 403,
        authErrorMessage: "Akun pengguna sedang tidak aktif",
      };
    }

    const issuedAt =
      typeof payload.iat === "number" ? payload.iat * 1000 : null;

    if (
      currentUser.tokenValidAfter &&
      (issuedAt === null || issuedAt < currentUser.tokenValidAfter.getTime())
    ) {
      return {
        user: null,
        currentUser: null,
        authErrorStatus: 401,
        authErrorMessage: "Sesi telah dicabut, silakan login ulang",
      };
    }

    return {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role.code,
      },
      currentUser,
      authErrorStatus: null,
      authErrorMessage: null,
    };
  })
  .onBeforeHandle({ as: "scoped" }, (context: any) => {
    const {
      authErrorStatus,
      authErrorMessage,
      set,
    } = context;

    if (authErrorMessage) {
      set.status = authErrorStatus ?? 401;

      return {
        success: false,
        message: authErrorMessage,
      };
    }
  });