const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

let refreshPromise: Promise<string | null> | null = null;

let inMemoryToken: string | null = null;

export function getAccessToken() {
  return inMemoryToken;
}

export function setAccessToken(token: string | null) {
  inMemoryToken = token;
}

function getToken() {
  return inMemoryToken;
}

function setToken(token: string) {
  inMemoryToken = token;
}

function forceLogout(message: string) {
  if (typeof window === "undefined") {
    return;
  }

  setAccessToken(null);
  localStorage.removeItem("user");

  sessionStorage.setItem("sessionExpiredMessage", message);

  if (!window.location.pathname.startsWith("/signin")) {
    window.location.href = "/signin";
  }
}


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

      if (response.status === 429) {
        // Rate limited, BUKAN berarti sesi invalid — jangan logout paksa.
        throw new Error("RATE_LIMITED");
      }

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
      if (error instanceof Error && error.message === "RATE_LIMITED") {
        throw error;
      }

      console.error("REFRESH TOKEN ERROR:", error);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

const PUBLIC_AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

function isPublicAuthPath(url: string) {
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

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

  if (isPublicAuthPath(url)) {
    return response;
  }

  if (response.status === 401) {
    let newToken: string | null = null;

    try {
      newToken = await refreshAccessToken();
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMITED") {
        throw new Error(
          "Terlalu banyak permintaan. Coba lagi dalam beberapa saat."
        );
      }

      throw error;
    }

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