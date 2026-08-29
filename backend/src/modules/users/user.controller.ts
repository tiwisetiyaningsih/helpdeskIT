import { userService } from "./user.service";
import { safeErrorMessage } from "../../utils/errorMessage";
import { getRoleErrorStatus } from "../../middleware/permission";
import { recordAuditLog } from "../../utils/auditLog";


type UserBody = {
  employeeId?: number | string;
  email?: string;
  password?: string;
  roleId?: number | string;
  isActive?: boolean;
};

export const userController = {
  async getAll({ user: authUser, set }: any) {
    try {
      const users = await userService.getAll();

      return {
        success: true,
        message: "Data user berhasil diambil.",
        data: users,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal mengambil data user.");

      console.error(error);

      set.status = getRoleErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async getById({ params, user: authUser, set }: any) {
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
      const message =
        safeErrorMessage(error, "Gagal mengambil detail user.");

      console.error(error);

      set.status = getRoleErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async getFormOptions({ user: authUser, set }: any) {
    try {
      const data = await userService.getFormOptions();

      return {
        success: true,
        data,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal mengambil pilihan employee dan role.");

      console.error(error);

      set.status = getRoleErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async create({
    body,
    user: authUser,
    set,
  }: {
    body: UserBody;
    user: any;
    set: any;
  }) {
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
          message: "Password minimal 12 karakter.",
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

      await recordAuditLog({
        actorId: authUser?.id ?? null,
        actorEmail: authUser?.email ?? null,
        action: "USER_CREATE",
        targetType: "User",
        targetId: user.id,
        metadata: { email: user.email, roleId: user.roleId },
      });

      set.status = 201;

      set.status = 201;

      return {
        success: true,
        message: "User berhasil ditambahkan.",
        data: user,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal menambahkan user.");

      console.error(error);

      const roleErrorStatus = getRoleErrorStatus(message);
      set.status = roleErrorStatus !== 500 ? roleErrorStatus : 400;

      return {
        success: false,
        message,
      };
    }
  },

  async update({
    params,
    body,
    user: authUser,
    set,
  }: {
    params: { id: string };
    body: UserBody;
    user: any;
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

      if (body.password !== undefined && body.password !== "") {
        const password = String(body.password);
        const hasMinLength = password.length >= 12;
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasMinLength || !hasLowercase || !hasUppercase || !hasNumber) {
          set.status = 400;

          return {
            success: false,
            message:
              "Password minimal 12 karakter dan harus mengandung huruf besar, huruf kecil, dan angka.",
          };
        }
      }

      const user = await userService.update(id, {
        employeeId,
        email: body.email,
        password: body.password,
        roleId,
        isActive: body.isActive,
      });

      await recordAuditLog({
        actorId: authUser?.id ?? null,
        actorEmail: authUser?.email ?? null,
        action: "USER_UPDATE",
        targetType: "User",
        targetId: id,
        metadata: {
          roleChanged: roleId !== undefined,
          passwordChanged: body.password !== undefined && body.password !== "",
          isActive: body.isActive,
        },
      });

      return {
        success: true,
        message: "User berhasil diperbarui.",
        data: user,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal memperbarui user.");

      console.error(error);

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
      const id = Number(params.id);

      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "ID user tidak valid.",
        };
      }

      await userService.delete(id);

      await recordAuditLog({
        actorId: authUser?.id ?? null,
        actorEmail: authUser?.email ?? null,
        action: "USER_DELETE",
        targetType: "User",
        targetId: id,
      });

      return {
        success: true,
        message: "User berhasil dihapus.",
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal menghapus user.");

      console.error(error);

      const roleErrorStatus = getRoleErrorStatus(message);
      set.status = roleErrorStatus !== 500 ? roleErrorStatus : 400;

      return {
        success: false,
        message,
      };
    }
  },
};