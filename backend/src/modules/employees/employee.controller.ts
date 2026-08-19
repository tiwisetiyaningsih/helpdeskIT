import { employeeService } from "./employee.service";

export const employeeController = {
  async getAll({ set }: any) {
    try {
      return await employeeService.getAll();
    } catch (error) {
      console.error("Get employees error:", error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal mengambil data employee",
      };
    }
  },

  async getById({ params, set }: any) {
    try {
      const result = await employeeService.getById(Number(params.id));

      if (!result.success) {
        set.status = result.status ?? 400;
      }

      return result;
    } catch (error) {
      console.error("Get employee error:", error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal mengambil detail employee",
      };
    }
  },

  async create({ body, set }: any) {
    try {
      const result = await employeeService.create(body);

      if (!result.success) {
        set.status = result.status ?? 400;
      } else {
        set.status = 201;
      }

      return result;
    } catch (error) {
      console.error("Create employee error:", error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal menambahkan employee",
      };
    }
  },

  async update({ params, body, set }: any) {
    try {
      const result = await employeeService.update(
        Number(params.id),
        body
      );

      if (!result.success) {
        set.status = result.status ?? 400;
      }

      return result;
    } catch (error) {
      console.error("Update employee error:", error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal memperbarui employee",
      };
    }
  },

  async delete({ params, set }: any) {
    try {
      const result = await employeeService.delete(Number(params.id));

      if (!result.success) {
        set.status = result.status ?? 400;
      }

      return result;
    } catch (error) {
      console.error("Delete employee error:", error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal menghapus employee",
      };
    }
  },
};