import { authService } from "./auth.service";
import { registerSchema } from "./auth.schema";

const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari, dalam detik

function setRefreshCookie(cookie: any, value: string) {
  cookie.refreshToken.set({
    value,
    httpOnly: true, // JS di browser tidak bisa baca cookie ini (proteksi dari XSS)
    secure: process.env.NODE_ENV === "production", // di localhost http, biarkan false
    sameSite: "strict",
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

  // BERUBAH: sekarang juga menerbitkan refresh token dan menaruhnya di cookie httpOnly
  async login({ body, jwt, cookie, set }: any) {
    const result = await authService.login(body);

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

  // BARU: tukar refresh token (dari cookie) dengan access token baru
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

  // BERUBAH: sekarang mencabut refresh token dari DB & cookie, bukan cuma respons kosong
  async logout({ cookie }: any) {
    await authService.revokeRefreshTokenByRaw(cookie.refreshToken?.value);
    cookie.refreshToken?.remove();

    return {
      success: true,
      message: "Logout berhasil",
    };
  },
};