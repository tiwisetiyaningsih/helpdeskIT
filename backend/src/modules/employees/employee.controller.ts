import { employeeService } from "./employee.service";
import { getRoleErrorStatus } from "../../middleware/permission";


export const employeeController = {
  async getAll({ user: authUser, set }: any) {
    try {
      return await employeeService.getAll();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil data employee";

      console.error("Get employees error:", error);

      set.status = getRoleErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async getById({ params, user: authUser, set }: any) {
    try {
      const result = await employeeService.getById(Number(params.id));

      if (!result.success) {
        set.status = result.status ?? 400;
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal mengambil detail employee";

      console.error("Get employee error:", error);

      set.status = getRoleErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async create({ body, user: authUser, set }: any) {
    try {
      const result = await employeeService.create(body);

      if (!result.success) {
        set.status = result.status ?? 400;
      } else {
        set.status = 201;
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menambahkan employee";

      console.error("Create employee error:", error);

      const roleErrorStatus = getRoleErrorStatus(message);
      set.status = roleErrorStatus !== 500 ? roleErrorStatus : 400;

      return {
        success: false,
        message,
      };
    }
  },

  async update({ params, body, user: authUser, set }: any) {
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
      const message =
        error instanceof Error
          ? error.message
          : "Gagal memperbarui employee";

      console.error("Update employee error:", error);

      const roleErrorStatus = getRoleErrorStatus(message);
      set.status = roleErrorStatus !== 500 ? roleErrorStatus : 400;

      return {
        success: false,
        message,
      };
    }
  },

  async delete({ params, user: authUser, set }: any) {
    try {
      const result = await employeeService.delete(Number(params.id));

      if (!result.success) {
        set.status = result.status ?? 400;
      }

      return result;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gagal menghapus employee";

      console.error("Delete employee error:", error);

      const roleErrorStatus = getRoleErrorStatus(message);
      set.status = roleErrorStatus !== 500 ? roleErrorStatus : 400;

      return {
        success: false,
        message,
      };
    }
  },
};