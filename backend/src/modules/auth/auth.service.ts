import bcrypt from "bcrypt";
import crypto from "crypto";
import { authRepository } from "./auth.repository";
import type { RegisterInput } from "./auth.schema";

const REFRESH_TOKEN_TTL_DAYS = 7; // umur refresh token

function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function generateRawToken() {
  return crypto.randomBytes(64).toString("hex");
}

export const authService = {
  async register(body: RegisterInput) {
    const nik = body.nik.trim();
    const email = body.email.trim().toLowerCase();

    const employee = await authRepository.findEmployeeByNik(nik);

    const REGISTRATION_ERROR = {
      success: false as const,
      status: 400,
      message: "NIK atau kode undangan tidak valid.",
    };

    if (!employee || !employee.isActive || employee.user) {
      return REGISTRATION_ERROR;
    }

    if (!employee.registrationTokenHash || !employee.registrationTokenExpiresAt) {
      return REGISTRATION_ERROR;
    }

    if (employee.registrationTokenExpiresAt < new Date()) {
      return REGISTRATION_ERROR;
    }

    const providedTokenHash = crypto
      .createHash("sha256")
      .update(body.registrationToken)
      .digest("hex");

    if (providedTokenHash !== employee.registrationTokenHash) {
      return REGISTRATION_ERROR;
    }

    const existingUser = await authRepository.findByEmail(email);

    if (existingUser) {
      return {
        success: false,
        status: 409,
        message: "Email sudah digunakan",
      };
    }

    const employeeRole = await authRepository.findRoleByName("Employee");

    if (!employeeRole) {
      return {
        success: false,
        status: 500,
        message: "Role Employee tidak ditemukan",
      };
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

        const user = await authRepository.createUser({
      employeeId: employee.id,
      email,
      password: hashedPassword,
      roleId: employeeRole.id,
    });

    await authRepository.clearEmployeeRegistrationToken(employee.id);

    return {
      success: true,
      status: 201,
      message: "Akun berhasil dibuat",
      user,
    };
  },

  async login(body: { email: string; password: string }) {
    const user = await authRepository.findByEmail(body.email);

    const DUMMY_HASH =
      "$2b$10$CwTycUXWue0Thq9StjUM0uJ8Zj8yQKn7oNsA0Q5nvhV5R3JT0vRXG";

    const validPassword = await bcrypt.compare(
      body.password,
      user?.password ?? DUMMY_HASH
    );

    if (!user || !user.isActive || !validPassword) {
      return {
        success: false,
        status: 401,
        message: "Email atau password salah",
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nama: user.employee.nama,
        role: user.role.name,
      },
    };
  },

  async getMe(userId: number) {
    try {
      const user = await authRepository.findById(Number(userId));

      if (!user) {
        return {
          success: false,
          status: 404,
          message: "User tidak ditemukan",
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          status: 403,
          message: "User tidak aktif",
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nama: user.employee?.nama ?? "Pengguna",
          role: user.role?.name ?? "User",
          isActive: user.isActive,
          employee: user.employee
            ? {
              nik: user.employee.nik,
              nama: user.employee.nama,
              jabatan: user.employee.jabatan,
              unitKerja: user.employee.unitKerja,
              jobTitle: user.employee.jobTitle,
            }
            : null,
        },
      };
    } catch (error) {
      console.error("GET /auth/me ERROR:", error);

      return {
        success: false,
        status: 500,
        message: "Gagal mengambil data profil",
      };
    }
  },

  // ================= BARU: refresh token =================

  /** Dipanggil setelah login sukses. Membuat refresh token & simpan hash-nya di DB. */
  async issueRefreshToken(userId: number) {
    const rawToken = generateRawToken();

    await authRepository.createRefreshToken({
      token: hashToken(rawToken),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    return rawToken; // raw token ini yang dikirim ke client lewat cookie
  },

  /**
   * Dipanggil saat access token (15 menit) sudah expired.
   * Verifikasi refresh token ke DB, cek pemiliknya, lalu rotasi (token lama mati, terbit token baru).
   */
  async refresh(rawToken: string | undefined, jwt: any) {
    if (!rawToken) {
      return { success: false as const, status: 401, message: "Refresh token tidak ditemukan" };
    }

    const hashed = hashToken(rawToken);
    const stored = await authRepository.findRefreshToken(hashed);

    if (!stored) {
      return { success: false as const, status: 401, message: "Refresh token tidak valid" };
    }

    // Token ini sudah pernah dipakai/dipensiunkan tapi dipakai lagi -> indikasi dicuri.
    // Cabut semua sesi user ini demi keamanan.
    if (stored.revokedAt) {
      await authRepository.revokeAllUserRefreshTokens(stored.userId);
      return { success: false as const, status: 401, message: "Sesi tidak valid, silakan login ulang" };
    }

    if (stored.expiresAt < new Date()) {
      return { success: false as const, status: 401, message: "Sesi sudah berakhir, silakan login ulang" };
    }

    // Verifikasi pemilik token: ambil user yang benar-benar terhubung ke userId di DB,
    // bukan dari data yang dikirim client.
    const user = await authRepository.findById(stored.userId);

    if (!user) {
      return { success: false as const, status: 401, message: "User pemilik sesi tidak ditemukan" };
    }

    if (!user.isActive) {
      return { success: false as const, status: 403, message: "User tidak aktif" };
    }

    const newRawToken = generateRawToken();

    await authRepository.rotateRefreshToken(stored.id, {
      token: hashToken(newRawToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    });

    const accessToken = await jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role.name,
    });

    return {
      success: true as const,
      accessToken,
      refreshToken: newRawToken,
      user: {
        id: user.id,
        email: user.email,
        nama: user.employee?.nama ?? "Pengguna",
        role: user.role?.name ?? "User",
      },
    };
  },

  async revokeRefreshTokenByRaw(rawToken: string | undefined) {
    if (!rawToken) return;

    const stored = await authRepository.findRefreshToken(hashToken(rawToken));

    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  },

  async logoutAllDevices(userId: number) {
    await authRepository.revokeAllUserRefreshTokens(userId);
    await authRepository.invalidateAllAccessTokens(userId);
  },

  async updateProfile(
    userId: number,
    input: { nama: string; email: string; jobTitle: string | null; unitKerja: string }
  ) {
    const existingWithEmail = await authRepository.findByEmail(input.email);

    if (existingWithEmail && existingWithEmail.id !== userId) {
      return {
        success: false as const,
        status: 409,
        message: "Email sudah digunakan oleh akun lain.",
      };
    }

    const updated = await authRepository.updateProfile(userId, {
      email: input.email,
      nama: input.nama,
      jobTitle: input.jobTitle,
      unitKerja: input.unitKerja,
    });

    if (!updated) {
      return {
        success: false as const,
        status: 404,
        message: "Pengguna tidak ditemukan.",
      };
    }

    return {
      success: true as const,
      message: "Profil berhasil diperbarui.",
      user: {
        id: updated.id,
        email: updated.email,
        nama: updated.employee?.nama ?? "Pengguna",
        role: updated.role?.name ?? "User",
        isActive: updated.isActive,
        employee: updated.employee
          ? {
            nik: updated.employee.nik,
            nama: updated.employee.nama,
            jabatan: updated.employee.jabatan,
            unitKerja: updated.employee.unitKerja,
            jobTitle: updated.employee.jobTitle,
          }
          : null,
      },
    };
  },
};