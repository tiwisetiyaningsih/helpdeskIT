import { Elysia } from "elysia";
import { authController } from "./auth.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  loginRateLimit,
  registerRateLimit,
  refreshRateLimit,
} from "../../middleware/rateLimit";

export const authRoute = new Elysia({
  prefix: "/auth",
})
  .post(
    "/register",
    (context) => authController.register(context),
    { beforeHandle: registerRateLimit }
  )

  .post(
    "/login",
    (context) => authController.login(context),
    { beforeHandle: loginRateLimit }
  )

  .post(
    "/refresh",
    (context) => authController.refresh(context),
    { beforeHandle: refreshRateLimit }
  )

  .use(authMiddleware)

  .get("/me", (context) =>
    authController.me(context)
  )


  .put("/profile", (context) =>
    authController.updateProfile(context)
  )

    .post("/logout", (context) =>
    authController.logout(context)
  )

  .post("/logout-all", (context) =>
    authController.logoutAllDevices(context)
  );