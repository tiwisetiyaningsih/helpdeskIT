import { Elysia } from "elysia";

import { authMiddleware } from "../../middleware/auth.middleware";
import {
  ROLE_GROUPS,
  requireRole,
} from "../../middleware/permission";
import { userController } from "./user.controller";

export const userRoute = new Elysia({
  prefix: "/users",
})
  .use(authMiddleware)
  .use(requireRole(ROLE_GROUPS.ADMIN))
  .get(
    "/",
    (context) => userController.getAll(context)
  )
  .get(
    "/form-options",
    (context) =>
      userController.getFormOptions(context)
  )
  .get(
    "/:id",
    (context) => userController.getById(context)
  )
  .post(
    "/",
    (context) =>
      userController.create(context as any)
  )
  .put(
    "/:id",
    (context) =>
      userController.update(context as any)
  )
  .delete(
    "/:id",
    (context) => userController.delete(context)
  );