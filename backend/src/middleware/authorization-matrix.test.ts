import { describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

mock.module("./auth.middleware", () => {
  return {
    authMiddleware: new Elysia().derive(
      { as: "scoped" },
      (context: any) => {
        const roleCode = context.headers["x-test-role"];
        if (!roleCode) {
          return { currentUser: null, user: null };
        }
        return {
          currentUser: {
            id: 1,
            email: "test@test.com",
            roleId: 1,
            isActive: true,
            role: { id: 1, code: roleCode, name: roleCode },
          },
          user: { id: 1, email: "test@test.com", role: roleCode },
        };
      }
    ),
  };
});

const { userRoute } = await import("../modules/users/user.route");
const { employeeRoute } = await import(
  "../modules/employees/employee.route"
);
const { roleRoute } = await import("../modules/roles/role.route");

function buildRequest(
  method: string,
  path: string,
  role?: string,
  body?: unknown
) {
  const headers: Record<string, string> = {};
  if (role) {
    headers["x-test-role"] = role;
  }
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return new Request(`http://localhost${path}`, init);
}

type Endpoint = {
  method: string;
  path: string;
  body?: unknown;
};

function testAdminOnlyRouter(
  label: string,
  route: { handle: (req: Request) => Promise<Response> },
  endpoints: Endpoint[]
) {
  describe(`Matriks otorisasi: ${label} (khusus ADMIN)`, () => {
    for (const { method, path, body } of endpoints) {
      test(`${method} ${path} — tanpa login ditolak (401)`, async () => {
        const res = await route.handle(
          buildRequest(method, path, undefined, body)
        );
        expect(res.status).toBe(401);
      });
      test(`${method} ${path} — role EMPLOYEE ditolak (403)`, async () => {
        const res = await route.handle(
          buildRequest(method, path, "EMPLOYEE", body)
        );
        expect(res.status).toBe(403);
      });
      test(`${method} ${path} — role IT_HELPDESK ditolak (403)`, async () => {
        const res = await route.handle(
          buildRequest(method, path, "IT_HELPDESK", body)
        );
        expect(res.status).toBe(403);
      });
      test(`${method} ${path} — role ADMIN lolos gerbang otorisasi`, async () => {
        const res = await route.handle(
          buildRequest(method, path, "ADMIN", body)
        );
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      });
    }
  });
}

testAdminOnlyRouter("/users", userRoute, [
  { method: "GET", path: "/users" },
  { method: "GET", path: "/users/form-options" },
  { method: "GET", path: "/users/1" },
  { method: "POST", path: "/users" },
  { method: "PUT", path: "/users/1" },
  { method: "DELETE", path: "/users/1" },
]);

testAdminOnlyRouter("/employees", employeeRoute, [
  { method: "GET", path: "/employees" },
  { method: "GET", path: "/employees/1" },
  { method: "POST", path: "/employees" },
  { method: "PUT", path: "/employees/1" },
  { method: "DELETE", path: "/employees/1" },
  { method: "POST", path: "/employees/1/registration-token" },
]);

testAdminOnlyRouter("/roles", roleRoute, [
  { method: "GET", path: "/roles" },
  { method: "GET", path: "/roles/1" },
  { method: "POST", path: "/roles", body: { name: "Tes Role" } },
  { method: "PUT", path: "/roles/1", body: { name: "Tes Role" } },
  { method: "DELETE", path: "/roles/1" },
]);
