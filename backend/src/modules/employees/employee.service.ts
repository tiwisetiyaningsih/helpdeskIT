import { employeeRepository } from "./employee.repository";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "./employee.schema";

export const employeeService = {
  async getAll() {
    const employees = await employeeRepository.findAll();

    return {
      success: true,
      data: employees,
    };
  },

  async getById(id: number) {
    const employee = await employeeRepository.findById(id);

    if (!employee) {
      return {
        success: false,
        status: 404,
        message: "Employee tidak ditemukan",
      };
    }

    return {
      success: true,
      data: employee,
    };
  },

  async create(body: unknown) {
    const validation = createEmployeeSchema.safeParse(body);

    if (!validation.success) {
      return {
        success: false,
        status: 400,
        message: validation.error.issues[0]?.message || "Data tidak valid",
        errors: validation.error.flatten(),
      };
    }

    const existingEmployee = await employeeRepository.findByNik(
      validation.data.nik
    );

    if (existingEmployee) {
      return {
        success: false,
        status: 409,
        message: "NIK sudah digunakan",
      };
    }

    const employee = await employeeRepository.create(validation.data);

    return {
      success: true,
      message: "Employee berhasil ditambahkan",
      data: employee,
    };
  },

  async update(id: number, body: unknown) {
    const employee = await employeeRepository.findById(id);

    if (!employee) {
      return {
        success: false,
        status: 404,
        message: "Employee tidak ditemukan",
      };
    }

    const validation = updateEmployeeSchema.safeParse(body);

    if (!validation.success) {
      return {
        success: false,
        status: 400,
        message: validation.error.issues[0]?.message || "Data tidak valid",
        errors: validation.error.flatten(),
      };
    }

    if (
      validation.data.nik &&
      validation.data.nik !== employee.nik
    ) {
      const existingNik = await employeeRepository.findByNik(
        validation.data.nik
      );

      if (existingNik) {
        return {
          success: false,
          status: 409,
          message: "NIK sudah digunakan",
        };
      }
    }

    const updatedEmployee = await employeeRepository.update(
      id,
      validation.data
    );

    return {
      success: true,
      message: "Employee berhasil diperbarui",
      data: updatedEmployee,
    };
  },

  async delete(id: number) {
    const employee = await employeeRepository.findById(id);

    if (!employee) {
      return {
        success: false,
        status: 404,
        message: "Employee tidak ditemukan",
      };
    }

    if (employee.user) {
      return {
        success: false,
        status: 409,
        message:
          "Employee tidak dapat dihapus karena sudah terhubung dengan akun user",
      };
    }

    await employeeRepository.delete(id);

    return {
      success: true,
      message: "Employee berhasil dihapus",
    };
  },
};