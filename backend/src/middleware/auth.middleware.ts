import { Elysia } from "elysia";

type JwtPayload = {
  id: number;
  email: string;
  role: string;
};

export const authMiddleware = new Elysia()
  .derive({ as: "scoped" }, async (context: any) => {
    const { jwt, headers } = context;

    const authorization = headers.authorization;

    if (!authorization) {
      return { user: null, authErrorMessage: "Token tidak ditemukan" };
    }

    if (!authorization.startsWith("Bearer ")) {
      return { user: null, authErrorMessage: "Format token tidak valid" };
    }

    const token = authorization.substring(7);
    const payload = await jwt.verify(token);

    if (!payload) {
      return {
        user: null,
        authErrorMessage: "Token tidak valid atau sudah kedaluwarsa",
      };
    }

    return { user: payload as JwtPayload, authErrorMessage: null };
  })
  .onBeforeHandle({ as: "scoped" }, (context: any) => {
    const { authErrorMessage, set } = context;

    if (authErrorMessage) {
      set.status = 401;
      return { success: false, message: authErrorMessage };
    }
  });