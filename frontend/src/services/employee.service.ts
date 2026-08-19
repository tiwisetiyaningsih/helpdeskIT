import { apiFetch } from "@/lib/apiFetch";

const API =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/employees`
    : "http://localhost:3001/employees";

export async function getEmployees() {
  const response = await apiFetch(API, {
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Gagal mengambil data employee."
    );
  }

  return data;
}

export async function createEmployee(data: any) {
  const response = await apiFetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
        "Gagal menambahkan employee."
    );
  }

  return result;
}

export async function updateEmployee(
  id: number,
  data: any
) {
  const response = await apiFetch(
    `${API}/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
        "Gagal memperbarui employee."
    );
  }

  return result;
}

export async function deleteEmployee(id: number) {
  const response = await apiFetch(`${API}/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  });

  const result = await response.json();

  console.log("DELETE EMPLOYEE RESPONSE:", {
    status: response.status,
    ok: response.ok,
    result,
  });

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
        "Gagal menghapus employee."
    );
  }

  return result;
}