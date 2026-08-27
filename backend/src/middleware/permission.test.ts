import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { ROLE_ACCESS, ROLE_CODES, requireRole } from "./permission";

function buildTestApp(currentUser: unknown) {
  return new Elysia()
    .derive(() => ({ currentUser }))
    .use(requireRole(ROLE_ACCESS.ADMIN))
    .get("/protected", () => ({ ok: true }));
}

describe("requireRole middleware", () => {
  test("menolak request tanpa user (401)", async () => {
    const app = buildTestApp(null);
    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(401);
  });

  test("menolak user dengan role EMPLOYEE ke endpoint khusus ADMIN (403)", async () => {
    const app = buildTestApp({
      id: 1,
      email: "employee@test.com",
      roleId: 3,
      isActive: true,
      role: { id: 3, code: ROLE_CODES.EMPLOYEE, name: "Employee" },
    });
    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(403);
  });

  test("mengizinkan user dengan role ADMIN (200)", async () => {
    const app = buildTestApp({
      id: 1,
      email: "admin@test.com",
      roleId: 1,
      isActive: true,
      role: { id: 1, code: ROLE_CODES.ADMIN, name: "Admin" },
    });
    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(200);
  });

  test("menolak kalau role.code null (mis. lupa di-seed)", async () => {
    const app = buildTestApp({
      id: 1,
      email: "broken@test.com",
      roleId: 1,
      isActive: true,
      role: { id: 1, code: null, name: "Admin" },
    });
    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(403);
  });
});