const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

let refreshPromise: Promise<string | null> | null = null;

function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("token");
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function forceLogout(message: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  sessionStorage.setItem("sessionExpiredMessage", message);

  // Hindari redirect loop kalau memang sudah di halaman signin.
  if (!window.location.pathname.startsWith("/signin")) {
    window.location.href = "/signin";
  }
}

/**
 * Menukar refresh token (dikirim otomatis lewat cookie httpOnly)
 * dengan access token baru. Kalau dipanggil berkali-kali secara
 * bersamaan, cukup satu request refresh yang jalan (di-share).
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json().catch(() => null);

      if (!data?.success || !data?.token) {
        return null;
      }

      setToken(data.token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      return data.token as string;
    } catch (error) {
      console.error("REFRESH TOKEN ERROR:", error);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Pengganti fetch() biasa untuk semua request yang butuh login.
 * - Otomatis menyertakan access token di header Authorization.
 * - Kalau access token expired (401), otomatis coba refresh
 *   memakai refresh token (cookie httpOnly, umur ~7 hari) dan
 *   mengulang request tersebut sekali dengan token baru.
 * - Kalau refresh token juga sudah habis / tidak valid, baru
 *   dianggap sesi benar-benar berakhir: hapus data login lokal
 *   dan redirect ke halaman login dengan pesan yang jelas.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  async function attempt(token: string | null) {
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  const token = getToken();
  let response = await attempt(token);

  if (response.status === 401) {
    const newToken = await refreshAccessToken();

    if (!newToken) {
      forceLogout("Sesi Anda telah berakhir. Silakan login kembali.");

      throw new Error(
        "Sesi Anda telah berakhir. Silakan login kembali."
      );
    }

    response = await attempt(newToken);

    // Kalau setelah refresh masih 401, berarti benar-benar tidak valid.
    if (response.status === 401) {
      forceLogout("Sesi Anda telah berakhir. Silakan login kembali.");

      throw new Error(
        "Sesi Anda telah berakhir. Silakan login kembali."
      );
    }
  }

  return response;
}

/**
 * Sama seperti apiFetch, tapi langsung mem-parsing body JSON dan
 * melempar Error kalau backend mengembalikan success: false.
 * Cocok dipakai menggantikan pola request<T>() yang lama.
 */
export async function apiFetchJson<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(path, options);

  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const responseText = await response.text();
    console.error("Response backend bukan JSON:", responseText);
    throw new Error("Backend tidak mengembalikan JSON.");
  }

  const data = await response.json();

  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.message || `Request gagal (${response.status})`
    );
  }

  return (data?.data ?? data) as T;
}