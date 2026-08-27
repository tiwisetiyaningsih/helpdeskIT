import { roleService } from "./role.service";
import { getRoleErrorStatus } from "../../middleware/permission";
import { safeErrorMessage } from "../../utils/errorMessage";
import { recordAuditLog } from "../../utils/auditLog";

export const roleController = {
  async getAll({ user, set }: any) {
    try {
      const roles = await roleService.getAll();

      return {
        success: true,
        roles,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal mengambil data role.");

      console.error("GET ROLES ERROR:", error);

      set.status = getRoleErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async getById({ user, params, set }: any) {
    try {
      const roleId = Number(params.id);

      if (Number.isNaN(roleId) || roleId <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "ID role tidak valid.",
        };
      }

      const role = await roleService.getById(roleId);

      return {
        success: true,
        role,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal mengambil detail role.");

      console.error("GET ROLE DETAIL ERROR:", error);

      set.status = getRoleErrorStatus(message);

      return {
        success: false,
        message,
      };
    }
  },

  async create({ user, body, set }: any) {
    try {
      const role = await roleService.create({
        name: String(body.name || ""),
        description: body.description ? String(body.description) : null,
      });

      set.status = 201;

      await recordAuditLog({
        actorId: user?.id ?? null,
        actorEmail: user?.email ?? null,
        action: "ROLE_CREATE",
        targetType: "Role",
        targetId: role.id,
        metadata: { name: role.name },
      });

      return {
        success: true,
        message: "Role berhasil ditambahkan.",
        role,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal menambahkan role.");

      console.error("CREATE ROLE ERROR:", error);

      const roleErrorStatus = getRoleErrorStatus(message);
      set.status = roleErrorStatus !== 500 ? roleErrorStatus : 400;

      return {
        success: false,
        message,
      };
    }
  },

  async update({ user, params, body, set }: any) {
    try {
      const roleId = Number(params.id);

      if (Number.isNaN(roleId) || roleId <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "ID role tidak valid.",
        };
      }

      const role = await roleService.update(roleId, {
        name: String(body.name || ""),
        description: body.description ? String(body.description) : null,
      });

      await recordAuditLog({
        actorId: user?.id ?? null,
        actorEmail: user?.email ?? null,
        action: "ROLE_UPDATE",
        targetType: "Role",
        targetId: roleId,
        metadata: { name: role.name },
      });

      return {
        success: true,
        message: "Role berhasil diperbarui.",
        role,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal memperbarui role.");

      console.error("UPDATE ROLE ERROR:", error);

      const roleErrorStatus = getRoleErrorStatus(message);
      set.status = roleErrorStatus !== 500 ? roleErrorStatus : 400;

      return {
        success: false,
        message,
      };
    }
  },

  async remove({ user, params, set }: any) {
    try {
      const roleId = Number(params.id);

      if (Number.isNaN(roleId) || roleId <= 0) {
        set.status = 400;

        return {
          success: false,
          message: "ID role tidak valid.",
        };
      }

      const role = await roleService.remove(roleId);

      await recordAuditLog({
        actorId: user?.id ?? null,
        actorEmail: user?.email ?? null,
        action: "ROLE_DELETE",
        targetType: "Role",
        targetId: roleId,
      });

      return {
        success: true,
        message: "Role berhasil dihapus.",
        role,
      };
    } catch (error) {
      const message =
        safeErrorMessage(error, "Gagal menghapus role.");

      console.error("DELETE ROLE ERROR:", error);

      const roleErrorStatus = getRoleErrorStatus(message);
      set.status = roleErrorStatus !== 500 ? roleErrorStatus : 400;

      return {
        success: false,
        message,
      };
    }
  },
};