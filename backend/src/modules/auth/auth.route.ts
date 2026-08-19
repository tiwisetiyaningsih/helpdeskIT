import { Elysia } from "elysia";
import { authController } from "./auth.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

export const authRoute = new Elysia({
  prefix: "/auth",
})
  .post("/register", (context) =>
    authController.register(context)
  )

  .post("/login", (context) =>
    authController.login(context)
  )

  .post("/refresh", (context) => authController.refresh(context))

  .use(authMiddleware)

  .get("/me", (context) =>
    authController.me(context)
  )

  .post("/logout", (context) =>
    authController.logout(context)
  );