import { Elysia } from "elysia";

type JwtPayload = {
  id: number;
  email: string;
  role: string;
};

export const authMiddleware = new Elysia().derive(
  { as: "scoped" },
  async (context: any) => {
    const { jwt, headers, set } = context;

    const authorization = headers.authorization;

    if (!authorization) {
      set.status = 401;
      throw new Error("Token tidak ditemukan");
    }

    if (!authorization.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("Format token tidak valid");
    }

    const token = authorization.substring(7);

    const payload = await jwt.verify(token);

    if (!payload) {
      set.status = 401;
      throw new Error("Token tidak valid atau sudah kedaluwarsa");
    }

    return {
      user: payload as JwtPayload,
    };
  }
);