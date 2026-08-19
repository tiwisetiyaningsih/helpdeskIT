import { userService } from "./user.service";

type UserBody = {
  employeeId?: number | string;
  email?: string;
  password?: string;
  roleId?: number | string;
  isActive?: boolean;
};

export const userController = {
  async getAll({ set }: any) {
    try {
      const users = await userService.getAll();

      return {
        success: true,
        message: "Data user berhasil diambil.",
        data: users,
      };
    } catch (error) {
      console.error(error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal mengambil data user.",
      };
    }
  },

  async getById({ params, set }: any) {
    try {
      const id = Number(params.id);

      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "ID user tidak valid.",
        };
      }

      const user = await userService.getById(id);

      if (!user) {
        set.status = 404;

        return {
          success: false,
          message: "User tidak ditemukan.",
        };
      }

      return {
        success: true,
        message: "Detail user berhasil diambil.",
        data: user,
      };
    } catch (error) {
      console.error(error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal mengambil detail user.",
      };
    }
  },

  async getFormOptions({ set }: any) {
    try {
      const data = await userService.getFormOptions();

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal mengambil pilihan employee dan role.",
      };
    }
  },

  async create({ body, set }: { body: UserBody; set: any }) {
    try {
      const employeeId = Number(body.employeeId);
      const roleId = Number(body.roleId);
      const email = body.email?.trim() ?? "";
      const password = body.password ?? "";

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "Employee wajib dipilih.",
        };
      }

      if (!email) {
        set.status = 400;

        return {
          success: false,
          message: "Email wajib diisi.",
        };
      }

      if (!email.includes("@")) {
        set.status = 400;

        return {
          success: false,
          message: "Format email tidak valid.",
        };
      }

      if (password.length < 6) {
        set.status = 400;

        return {
          success: false,
          message: "Password minimal 6 karakter.",
        };
      }

      if (!Number.isInteger(roleId) || roleId <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "Role wajib dipilih.",
        };
      }

      const user = await userService.create({
        employeeId,
        email,
        password,
        roleId,
        isActive: body.isActive ?? true,
      });

      set.status = 201;

      return {
        success: true,
        message: "User berhasil ditambahkan.",
        data: user,
      };
    } catch (error) {
      console.error(error);

      set.status = 400;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal menambahkan user.",
      };
    }
  },

  async update({
    params,
    body,
    set,
  }: {
    params: { id: string };
    body: UserBody;
    set: any;
  }) {
    try {
      const id = Number(params.id);

      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "ID user tidak valid.",
        };
      }

      const employeeId =
        body.employeeId !== undefined
          ? Number(body.employeeId)
          : undefined;

      const roleId =
        body.roleId !== undefined ? Number(body.roleId) : undefined;

      if (
        employeeId !== undefined &&
        (!Number.isInteger(employeeId) || employeeId <= 0)
      ) {
        set.status = 400;

        return {
          success: false,
          message: "Employee tidak valid.",
        };
      }

      if (
        roleId !== undefined &&
        (!Number.isInteger(roleId) || roleId <= 0)
      ) {
        set.status = 400;

        return {
          success: false,
          message: "Role tidak valid.",
        };
      }

      if (
        body.password !== undefined &&
        body.password !== "" &&
        body.password.length < 6
      ) {
        set.status = 400;

        return {
          success: false,
          message: "Password minimal 6 karakter.",
        };
      }

      const user = await userService.update(id, {
        employeeId,
        email: body.email,
        password: body.password,
        roleId,
        isActive: body.isActive,
      });

      return {
        success: true,
        message: "User berhasil diperbarui.",
        data: user,
      };
    } catch (error) {
      console.error(error);

      set.status = 400;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui user.",
      };
    }
  },

  async delete({ params, set }: any) {
    try {
      const id = Number(params.id);

      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "ID user tidak valid.",
        };
      }

      await userService.delete(id);

      return {
        success: true,
        message: "User berhasil dihapus.",
      };
    } catch (error) {
      console.error(error);

      set.status = 400;

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal menghapus user.",
      };
    }
  },
};