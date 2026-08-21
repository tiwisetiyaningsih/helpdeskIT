import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Mulai seeding...");

  // =========================
  // ROLE
  // =========================
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      description: "Administrator Sistem",
    },
  });

  const consultantRole = await prisma.role.upsert({
    where: { name: "IT Helpdesk" },
    update: {},
    create: {
      name: "IT Helpdesk",
      description: "Petugas Helpdesk",
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: "Employee" },
    update: {},
    create: {
      name: "Employee",
      description: "Karyawan",
    },
  });

  console.log("✅ Role berhasil dibuat");

  // =========================
  // EMPLOYEE
  // =========================
  const employee = await prisma.employee.upsert({
    where: {
      nik: "20260001",
    },
    update: {},
    create: {
      nik: "20260001",
      nama: "Administrator",
      jabatan: "Administrator",
      unitKerja: "IT",
      isActive: true,
    },
  });

  console.log("✅ Employee berhasil dibuat");

  // =========================
  // HASH PASSWORD
  // =========================
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // =========================
  // USER ADMIN
  // =========================
  await prisma.user.upsert({
    where: {
      email: "admin@helpdesk.com",
    },
    update: {},
    create: {
      employeeId: employee.id,
      email: "admin@helpdesk.com",
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log("✅ User Admin berhasil dibuat");

  console.log("🎉 Seeding selesai");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });