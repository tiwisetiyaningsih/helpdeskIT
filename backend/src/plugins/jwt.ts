import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

export const jwtPlugin = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "supersecretkey", exp: "15m"
    })
  );