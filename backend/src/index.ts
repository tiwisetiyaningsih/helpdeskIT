import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

import { jwtPlugin } from "./plugins/jwt";
import { authRoute } from "./modules/auth/auth.route";
import { employeeRoute } from "./modules/employees/employee.route";
import { userRoute } from "./modules/users/user.route";
import { ticketRoute } from "./modules/ticket/ticket.route";
import { roleRoute } from "./modules/roles/role.route";

const app = new Elysia();

function applySecurityHeaders(set: any) {
  set.headers["X-Content-Type-Options"] = "nosniff";
  set.headers["X-Frame-Options"] = "DENY";
  set.headers["Referrer-Policy"] = "no-referrer";
  set.headers["Permissions-Policy"] =
    "camera=(), microphone=(), geolocation=()";
  set.headers["Content-Security-Policy"] =
    "default-src 'none'; frame-ancestors 'none'";

  if (process.env.NODE_ENV === "production") {
    set.headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains";
  }
}

app.onAfterHandle(({ set }) => {
  applySecurityHeaders(set);
});

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

app.onError(({ code, error, set }) => {
  console.error("Unhandled error:", error);
  applySecurityHeaders(set);

  if (code === "VALIDATION") {
    set.status = 400;
    return { success: false, message: "Data yang dikirim tidak valid." };
  }

  if (code === "NOT_FOUND") {
    set.status = 404;
    return { success: false, message: "Endpoint tidak ditemukan." };
  }

  set.status = 500;
  return { success: false, message: "Terjadi kesalahan pada server." };
});

app.listen(3000);

console.log(
  "Server berjalan di http://localhost:3000"
);