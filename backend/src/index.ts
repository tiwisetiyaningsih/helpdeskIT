import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

import { jwtPlugin } from "./plugins/jwt";
import { authRoute } from "./modules/auth/auth.route";
import { employeeRoute } from "./modules/employees/employee.route";
import { userRoute } from "./modules/users/user.route";
import { ticketRoute } from "./modules/ticket/ticket.route";
import { roleRoute } from "./modules/roles/role.route";

const app = new Elysia();

app.use(
  cors({
    origin: "http://localhost:3000",

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
    ],

    credentials: true,
  })
);

app.use(jwtPlugin);

app.use(authRoute);

app.get("/", () => ({
  message: "Help Desk API berjalan 🚀",
}));

app.use(employeeRoute);
app.use(userRoute);
app.use(ticketRoute);
app.use(roleRoute);

app.listen(3000);

console.log(
  "Server berjalan di http://localhost:3000"
);