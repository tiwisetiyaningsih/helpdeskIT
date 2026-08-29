import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/config";

export type EmployeeOption = {
  id: number;
  nik: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jobTitle?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;

  user?: {
    id: number;
  } | null;
};

export type RoleOption = {
  id: number;
  name: string;
  description?: string | null;
};

export type User = {
  id: number;
  employeeId: number;
  email: string;
  roleId: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;

  employee?: {
    id: number;
    nik: string;
    nama: string;
    jabatan: string;
    unitKerja: string;
    jobTitle?: string | null;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;

  role?: {
    id: number;
    name: string;
    description?: string | null;
  } | null;
};

export type UserPayload = {
  employeeId: number;
  email: string;
  password?: string;
  roleId: number;
  isActive: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await response.text();
  let result: ApiResponse<T>;

  try {
    result = text ? JSON.parse(text) : { success: response.ok };
  } catch {
    throw new Error(`Respons backend bukan JSON: ${text || "respons kosong"}`);
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || `Request gagal (${response.status})`);
  }

  return result.data as T;
}
export async function getUsers(): Promise<
  User[]
> {
  return request<User[]>(
    "/users"
  );
}

export async function getUserById(
  id: number
): Promise<User> {
  return request<User>(
    `/users/${id}`
  );
}

export async function getUserFormOptions(): Promise<{
  employees: EmployeeOption[];
  roles: RoleOption[];
}> {
  return request<{
    employees: EmployeeOption[];
    roles: RoleOption[];
  }>("/users/form-options");
}

export async function createUser(
  payload: UserPayload
): Promise<User> {
  return request<User>(
    "/users",
    {
      method: "POST",
      body: JSON.stringify(
        payload
      ),
    }
  );
}

export async function updateUser(
  id: number,
  payload: UserPayload
): Promise<User> {
  return request<User>(
    `/users/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(
        payload
      ),
    }
  );
}

export async function deleteUser(
  id: number
): Promise<void> {
  await request<undefined>(
    `/users/${id}`,
    {
      method: "DELETE",
    }
  );
}