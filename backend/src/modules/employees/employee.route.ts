import { Elysia } from "elysia";
import { employeeController } from "./employee.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

export const employeeRoute = new Elysia({
  prefix: "/employees",
})
  .use(authMiddleware)
  .get("/", (context) => employeeController.getAll(context))
  .get("/:id", (context) => employeeController.getById(context))
  .post("/", (context) => employeeController.create(context))
  .put("/:id", (context) => employeeController.update(context))
  .delete("/:id", (context) => employeeController.delete(context));