import { Elysia } from "elysia";

export const ROLE_CODES = {
  ADMIN: "ADMIN",
  IT_HELPDESK: "IT_HELPDESK",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type RoleCode =
  (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const ROLE_ACCESS = {
  ADMIN: [ROLE_CODES.ADMIN],
  IT_HELPDESK: [ROLE_CODES.IT_HELPDESK],
  ADMIN_OR_IT_HELPDESK: [
    ROLE_CODES.ADMIN,
    ROLE_CODES.IT_HELPDESK,
  ],
} satisfies Record<string, RoleCode[]>;

export const ROLE_NAME_IT_HELPDESK = "IT Helpdesk";

export const ROLE_GROUPS: Record<
  string,
  string[]
> = {
  ADMIN: ["ADMIN", "ADMINISTRATOR"],
  IT_HELPDESK: ["IT HELPDESK"],
  ADMIN_OR_IT_HELPDESK: [
    "ADMIN",
    "ADMINISTRATOR",
    "IT HELPDESK",
  ],
};

type CurrentUser = {
  id: number;
  email: string;
  roleId: number;
  isActive: boolean;
  role: {
    id: number;
    code: string | null;
    name: string;
  };
};

export const requireRole = (
  allowedRoles: readonly RoleCode[]
) =>
  new Elysia({
    name: `requireRole(${allowedRoles.join(",")})`,
  })
    .derive({ as: "scoped" }, (context: any) => {
      const currentUser =
        context.currentUser as CurrentUser | null;

      if (!currentUser) {
        return {
          roleErrorStatus: 401,
          roleErrorMessage:
            "Sesi pengguna tidak valid.",
        };
      }

      const roleCode = currentUser.role.code;

      if (
        !roleCode ||
        !allowedRoles.includes(roleCode as RoleCode)
      ) {
        return {
          roleErrorStatus: 403,
          roleErrorMessage:
            "Anda tidak memiliki akses untuk aksi ini.",
        };
      }

      return {
        roleUser: currentUser,
        roleErrorStatus: null,
        roleErrorMessage: null,
      };
    })
    .onBeforeHandle(
      { as: "scoped" },
      (context: any) => {
        const {
          roleErrorStatus,
          roleErrorMessage,
          set,
        } = context;

        if (roleErrorMessage) {
          set.status = roleErrorStatus ?? 403;

          return {
            success: false,
            message: roleErrorMessage,
          };
        }
      }
    );