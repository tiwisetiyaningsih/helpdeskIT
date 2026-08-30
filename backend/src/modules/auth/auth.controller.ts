import { authService } from "./auth.service";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "./auth.schema";

const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari, dalam detik

function setRefreshCookie(cookie: any, value: string) {
  cookie.refreshToken.set({
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export const authController = {
  async register({ body, set }: any) {
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      set.status = 400;

      return {
        success: false,
        message:
          validation.error.issues[0]?.message ??
          "Data registrasi tidak valid",
      };
    }

    try {
      const result = await authService.register(validation.data);

      if (!result.success) {
        set.status = result.status ?? 400;
        return result;
      }

      set.status = result.status ?? 201;

      return {
        success: true,
        message: result.message,
        user: result.user,
      };
    } catch (error) {
      console.error("POST /auth/register ERROR:", error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal membuat akun",
      };
    }
  },

  // BERUBAH: sekarang divalidasi pakai loginSchema + dibungkus try/catch,
  // supaya body aneh (kosong/salah tipe) tidak bikin server crash 500 mentah.
  async login({ body, jwt, cookie, set }: any) {
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      set.status = 400;

      return {
        success: false,
        message:
          validation.error.issues[0]?.message ?? "Data login tidak valid",
      };
    }

    try {
      const result = await authService.login(validation.data);

      if (!result.success) {
        set.status = result.status ?? 400;
        return result;
      }

      const user = result.user!;

      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = await authService.issueRefreshToken(user.id);
      setRefreshCookie(cookie, refreshToken);

      return {
        success: true,
        token,
        user,
      };
    } catch (error) {
      console.error("POST /auth/login ERROR:", error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal login",
      };
    }
  },

  async me({ user, set }: any) {
    if (!user?.id) {
      set.status = 401;

      return {
        success: false,
        message: "Data user dari token tidak ditemukan",
      };
    }

    const result = await authService.getMe(Number(user.id));

    if (!result.success) {
      set.status = result.status ?? 500;
    }

    return result;
  },

  // BARU: update profil milik sendiri (H-05 — endpoint ini sebelumnya
  // dipanggil frontend tapi tidak pernah ada di backend).
  async updateProfile({ user, body, set }: any) {
    if (!user?.id) {
      set.status = 401;

      return {
        success: false,
        message: "Data user dari token tidak ditemukan",
      };
    }

    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      set.status = 400;

      return {
        success: false,
        message:
          validation.error.issues[0]?.message ?? "Data profil tidak valid",
      };
    }

    try {
      const result = await authService.updateProfile(Number(user.id), {
        nama: validation.data.nama,
        email: validation.data.email,
        jobTitle: validation.data.jobTitle ?? null,
        unitKerja: validation.data.unitKerja,
      });

      if (!result.success) {
        set.status = result.status ?? 400;
      }

      return result;
    } catch (error) {
      console.error("PUT /auth/profile ERROR:", error);

      set.status = 500;

      return {
        success: false,
        message: "Gagal memperbarui profil",
      };
    }
  },

  async refresh({ cookie, jwt, set }: any) {
    const rawToken = cookie.refreshToken?.value;

    const result = await authService.refresh(rawToken, jwt);

    if (!result.success) {
      cookie.refreshToken?.remove();
      set.status = result.status ?? 401;
      return result;
    }

    setRefreshCookie(cookie, result.refreshToken);

    return {
      success: true,
      token: result.accessToken,
      user: result.user,
    };
  },

    async logout({ cookie }: any) {
    await authService.revokeRefreshTokenByRaw(cookie.refreshToken?.value);
    cookie.refreshToken?.remove();

    return {
      success: true,
      message: "Logout berhasil",
    };
  },

  async logoutAllDevices({ cookie, currentUser }: any) {
    await authService.logoutAllDevices(currentUser.id);
    cookie.refreshToken?.remove();

    return {
      success: true,
      message:
        "Berhasil logout dari semua perangkat. Silakan login ulang.",
    };
  },
};