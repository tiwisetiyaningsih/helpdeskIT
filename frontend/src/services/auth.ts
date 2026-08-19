import { apiFetch } from "@/lib/apiFetch";

const API_URL = "http://localhost:3001";

export async function login(
  email: string,
  password: string
) {
  const response = await apiFetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Login gagal"
    );
  }

  return data;
}