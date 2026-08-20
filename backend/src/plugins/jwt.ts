import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET wajib diset di environment variable (minimal 32 karakter). " +
      "Generate dengan: openssl rand -hex 32"
  );
}

export const jwtPlugin = new Elysia().use(
  jwt({
    name: "jwt",
    secret: JWT_SECRET,
    exp: "15m",
  })
);