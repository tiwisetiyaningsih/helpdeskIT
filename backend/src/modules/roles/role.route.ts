import { Elysia, t } from "elysia";

import { authMiddleware } from "../../middleware/auth.middleware";
import {
  ROLE_ACCESS,
  requireRole,
} from "../../middleware/permission";
import { roleController } from "./role.controller";

export const roleRoute = new Elysia({
  prefix: "/roles",
})
  .use(authMiddleware)

  .use(requireRole(ROLE_ACCESS.ADMIN))

  .get("/", (context) =>
    roleController.getAll(context)
  )

  .get(
    "/:id",
    (context) =>
      roleController.getById(context),
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  .post(
    "/",
    (context) =>
      roleController.create(context),
    {
      body: t.Object({
        name: t.String({
          minLength: 2,
          maxLength: 50,
        }),

        description: t.Optional(
          t.Nullable(
            t.String({
              maxLength: 255,
            })
          )
        ),
      }),
    }
  )

  .put(
    "/:id",
    (context) =>
      roleController.update(context),
    {
      params: t.Object({
        id: t.String(),
      }),

      body: t.Object({
        name: t.String({
          minLength: 2,
          maxLength: 50,
        }),

        description: t.Optional(
          t.Nullable(
            t.String({
              maxLength: 255,
            })
          )
        ),
      }),
    }
  )

  .delete(
    "/:id",
    (context) =>
      roleController.remove(context),
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );