import { Elysia } from "elysia";
import { employeeController } from "./employee.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { ROLE_GROUPS, requireRole } from "../../middleware/permission";

export const employeeRoute = new Elysia({
  prefix: "/employees",
})
  .use(authMiddleware)
  .use(requireRole(ROLE_GROUPS.ADMIN))
  .get("/", (context) => employeeController.getAll(context))
  .get("/:id", (context) => employeeController.getById(context))
  .post("/", (context) => employeeController.create(context))
  .put("/:id", (context) => employeeController.update(context))
  .delete("/:id", (context) => employeeController.delete(context));