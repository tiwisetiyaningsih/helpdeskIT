"use client";

import { apiFetch } from "@/lib/apiFetch";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Role = {
  id: number;
  name: string;
  description: string | null;
  userCount: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type RoleResponse = {
  success?: boolean;
  message?: string;
  roles?: Role[];
  role?: Role;
};

type RoleForm = {
  name: string;
  description: string;
};

const INITIAL_FORM: RoleForm = {
  name: "",
  description: "",
};

async function parseJson<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get(
      "content-type"
    );

  if (
    !contentType?.includes(
      "application/json"
    )
  ) {
    const responseText =
      await response.text();

    console.error(
      "Response backend:",
      responseText
    );

    throw new Error(
      "Backend tidak mengembalikan JSON."
    );
  }

  return response.json() as Promise<T>;
}

function formatDate(
  value?: string
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

function getInitial(name: string) {
  return (
    name.trim().charAt(0).toUpperCase() ||
    "R"
  );
}

export default function RoleManagement() {
  const [roles, setRoles] =
    useState<Role[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [form, setForm] =
    useState<RoleForm>(
      INITIAL_FORM
    );

  const [formError, setFormError] =
    useState("");

  const [formMode, setFormMode] =
    useState<"create" | "edit">(
      "create"
    );

  const [formOpen, setFormOpen] =
    useState(false);

  const [selectedRole, setSelectedRole] =
    useState<Role | null>(null);

  const [
    detailRole,
    setDetailRole,
  ] = useState<Role | null>(null);

  const [
    deleteRole,
    setDeleteRole,
  ] = useState<Role | null>(null);

  const loadRoles =
    useCallback(
      async (
        showLoading = false
      ) => {

        try {
          if (showLoading) {
            setLoading(true);
          }

          const response =
            await apiFetch(
              `${API_URL}/roles`,
              {
                method: "GET",

                headers: {
                  Accept: "application/json",
                },

                cache: "no-store",
              }
            );
          const data =
            await parseJson<RoleResponse>(
              response
            );

          if (
            !response.ok ||
            data.success === false
          ) {
            throw new Error(
              data.message ||
              "Gagal mengambil data role."
            );
          }

          setRoles(
            Array.isArray(data.roles)
              ? data.roles
              : []
          );

          setError("");
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data role."
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      []
    );

  useEffect(() => {
    void loadRoles(true);

    const intervalId =
      window.setInterval(() => {
        void loadRoles(false);
      }, 15000);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadRoles]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        setSuccess("");
      }, 3000);

    return () => {
      window.clearTimeout(
        timeoutId
      );
    };
  }, [success]);

  const statistics =
    useMemo(() => {
      return {
        totalRole: roles.length,

        totalUser: roles.reduce(
          (total, role) =>
            total + role.userCount,
          0
        ),

        defaultRole: roles.filter(
          (role) => role.isDefault
        ).length,

        customRole: roles.filter(
          (role) => !role.isDefault
        ).length,
      };
    }, [roles]);

  const filteredRoles =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return roles;
      }

      return roles.filter(
        (role) =>
          [
            role.name,
            role.description || "",
            role.userCount,
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
      );
    }, [roles, search]);

  function openCreateModal() {
    setFormMode("create");
    setSelectedRole(null);
    setForm(INITIAL_FORM);
    setFormError("");
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEditModal(role: Role) {
    setFormMode("edit");
    setSelectedRole(role);

    setForm({
      name: role.name,
      description:
        role.description || "",
    });

    setFormError("");
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setSelectedRole(null);
    setForm(INITIAL_FORM);
    setFormError("");
  }

  async function submitRole(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name =
      form.name.trim();

    if (!name) {
      setFormError(
        "Nama role wajib diisi."
      );

      return;
    }

    if (name.length < 2) {
      setFormError(
        "Nama role minimal 2 karakter."
      );

      return;
    }

    try {
      setSaving(true);
      setFormError("");

      const isEdit =
        formMode === "edit" &&
        selectedRole;

      const response =
        await apiFetch(
          isEdit
            ? `${API_URL}/roles/${selectedRole.id}`
            : `${API_URL}/roles`,
          {
            method:
              isEdit
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },

            body: JSON.stringify({
              name,
              description:
                form.description.trim() ||
                null,
            }),
          }
        );

      const data =
        await parseJson<RoleResponse>(
          response
        );

      if (
        !response.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
          "Gagal menyimpan role."
        );
      }

      // Tutup modal langsung setelah request berhasil.
      // closeFormModal() tidak dipakai di sini karena saving masih true.
      setFormOpen(false);
      setSelectedRole(null);
      setForm(INITIAL_FORM);
      setFormError("");

      setSuccess(
        data.message ||
        (isEdit
          ? "Role berhasil diperbarui."
          : "Role berhasil ditambahkan.")
      );

      await loadRoles(false);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan role."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRole) {
      return;
    }

    try {
      setDeleting(true);

      const response =
        await apiFetch(
          `${API_URL}/roles/${deleteRole.id}`,
          {
            method: "DELETE",

            headers: {
              Accept: "application/json",
            },
          }
        );

      const data =
        await parseJson<RoleResponse>(
          response
        );

      if (
        !response.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
          "Gagal menghapus role."
        );
      }

      setDeleteRole(null);

      setSuccess(
        data.message ||
        "Role berhasil dihapus."
      );

      await loadRoles(false);
    } catch (error) {
      setDeleteRole(null);

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus role."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-7 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03] sm:px-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[35%] overflow-hidden lg:block">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-50 dark:bg-brand-500/10" />

            <div className="absolute right-36 top-8 h-20 w-20 rounded-full bg-brand-100/60 dark:bg-brand-500/10" />

            <div
              className="absolute bottom-4 left-2 h-20 w-44 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(70,95,255,0.28) 1.5px, transparent 1.5px)",

                backgroundSize:
                  "16px 16px",
              }}
            />
          </div>

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <span className="h-2 w-2 rounded-full bg-brand-500" />

                Master Data
              </div>

              <h1 className="mt-5 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                Manajemen Role
              </h1>

              <p className="mt-3 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Kelola role yang digunakan
                untuk menentukan jenis akses
                pengguna dalam sistem Help
                Desk IT.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-theme-sm font-semibold text-white shadow-theme-sm transition hover:bg-brand-600"
            >
              <PlusIcon />

              Tambah Role
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => {
                setError("");
                void loadRoles(true);
              }}
              className="font-semibold underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-success-200 bg-success-50 px-5 py-4 text-theme-sm font-medium text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400">
            {success}
          </div>
        )}

        {/* Statistik */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Role"
            value={statistics.totalRole}
            description="Seluruh role"
            color="blue"
            icon={<ShieldIcon />}
          />

          <SummaryCard
            label="Total User"
            value={statistics.totalUser}
            description="Akun terdaftar"
            color="purple"
            icon={<UsersIcon />}
          />

          <SummaryCard
            label="Role Bawaan"
            value={
              statistics.defaultRole
            }
            description="Role utama sistem"
            color="green"
            icon={<LockIcon />}
          />

          <SummaryCard
            label="Role Tambahan"
            value={
              statistics.customRole
            }
            description="Role buatan admin"
            color="orange"
            icon={<CustomRoleIcon />}
          />
        </div>

        {/* Tabel */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                Daftar Role
              </h2>

              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                Menampilkan{" "}
                {filteredRoles.length} dari{" "}
                {roles.length} role.
              </p>
            </div>

            <div className="relative w-full lg:w-[330px]">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Cari nama atau deskripsi role..."
                className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : filteredRoles.length ===
            0 ? (
            <EmptyState
              hasRoles={roles.length > 0}
              onAddRole={openCreateModal}
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead className="bg-gray-50/80 dark:bg-gray-900">
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <TableHeader>
                        Role
                      </TableHeader>

                      <TableHeader>
                        Deskripsi
                      </TableHeader>

                      <TableHeader>
                        Jumlah User
                      </TableHeader>

                      <TableHeader>
                        Tipe
                      </TableHeader>

                      <TableHeader>
                        Terakhir Diubah
                      </TableHeader>

                      <th className="px-5 py-4 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredRoles.map(
                      (role) => (
                        <tr
                          key={role.id}
                          className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                        >
                          <td className="px-5 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-theme-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                                {getInitial(
                                  role.name
                                )}
                              </div>

                              <div>
                                <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                                  {role.name}
                                </p>

                                {/* <p className="mt-0.5 text-theme-xs text-gray-400">
                                  ID #{role.id}
                                </p> */}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            <p className="max-w-[360px] text-theme-sm leading-6 text-gray-600 dark:text-gray-300">
                              {role.description ||
                                "Belum ada deskripsi."}
                            </p>
                          </td>

                          <td className="px-5 py-5">
                            <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1.5 text-theme-xs font-semibold text-purple-700 dark:bg-purple-500/15 dark:text-purple-400">
                              <UsersSmallIcon />

                              {role.userCount} user
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            {role.isDefault ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-theme-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-400">
                                <LockSmallIcon />

                                Bawaan
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-theme-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                Tambahan
                              </span>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-5 text-theme-sm text-gray-500 dark:text-gray-400">
                            {formatDate(
                              role.updatedAt
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* Detail */}
                              <ActionButton
                                title="Lihat detail"
                                onClick={() => setDetailRole(role)}
                                variant="view"
                                icon={<EyeIcon />}
                              />

                              {/* Edit */}
                              <ActionButton
                                title="Edit role"
                                onClick={() => openEditModal(role)}
                                variant="edit"
                                icon={<EditIcon />}
                              />

                              {/* Hapus - hanya role tambahan */}
                              {!role.isDefault && (
                                <ActionButton
                                  title="Hapus role"
                                  onClick={() => setDeleteRole(role)}
                                  variant="delete"
                                  icon={<TrashIcon />}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-4 p-4 lg:hidden">
                {filteredRoles.map(
                  (role) => (
                    <article
                      key={role.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          {getInitial(
                            role.name
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="truncate text-theme-sm font-bold text-gray-800 dark:text-white/90">
                              {role.name}
                            </h3>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-theme-xs font-medium ${role.isDefault
                                ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                            >
                              {role.isDefault
                                ? "Bawaan"
                                : "Tambahan"}
                            </span>
                          </div>

                          <p className="mt-2 line-clamp-2 text-theme-xs leading-5 text-gray-500 dark:text-gray-400">
                            {role.description ||
                              "Belum ada deskripsi."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MobileInfo
                          label="Jumlah User"
                          value={`${role.userCount} user`}
                        />

                        <MobileInfo
                          label="Diperbarui"
                          value={formatDate(
                            role.updatedAt
                          )}
                        />
                      </div>

                      <div
                        className={`mt-4 grid gap-2 ${role.isDefault
                          ? "grid-cols-2"
                          : "grid-cols-3"
                          }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setDetailRole(role)
                          }
                          className="rounded-lg border border-gray-200 px-3 py-2.5 text-theme-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                        >
                          Detail
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(role)
                          }
                          className="rounded-lg bg-brand-500 px-3 py-2.5 text-theme-xs font-semibold text-white"
                        >
                          Edit
                        </button>

                        {!role.isDefault && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteRole(
                                role
                              )
                            }
                            className="rounded-lg bg-error-50 px-3 py-2.5 text-theme-xs font-semibold text-error-600 dark:bg-error-500/15 dark:text-error-400"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {formOpen && (
        <RoleFormModal
          mode={formMode}
          form={form}
          selectedRole={selectedRole}
          saving={saving}
          error={formError}
          onChange={setForm}
          onClose={closeFormModal}
          onSubmit={submitRole}
        />
      )}

      {detailRole && (
        <RoleDetailModal
          role={detailRole}
          onClose={() =>
            setDetailRole(null)
          }
          onEdit={() => {
            setDetailRole(null);
            openEditModal(detailRole);
          }}
        />
      )}

      {deleteRole && (
        <DeleteRoleModal
          role={deleteRole}
          deleting={deleting}
          onClose={() => {
            if (!deleting) {
              setDeleteRole(null);
            }
          }}
          onConfirm={() =>
            void confirmDelete()
          }
        />
      )}
    </>
  );
}

function RoleFormModal({
  mode,
  form,
  selectedRole,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  form: RoleForm;
  selectedRole: Role | null;
  saving: boolean;
  error: string;
  onChange: React.Dispatch<
    React.SetStateAction<RoleForm>
  >;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>
  ) => void;
}) {
  const nameLocked =
    mode === "edit" &&
    Boolean(selectedRole?.isDefault);

  return (
    <ModalWrapper onClose={onClose}>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-theme-xl dark:bg-gray-900"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
              {mode === "create"
                ? "Tambah Role"
                : "Edit Role"}
            </h2>

            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              {mode === "create"
                ? "Tambahkan role baru ke dalam sistem."
                : "Perbarui informasi role yang dipilih."}
            </p>
          </div>

          <CloseButton
            onClick={onClose}
          />
        </div>

        <div className="space-y-5 px-6 py-6">
          {error && (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
              Nama Role{" "}
              <span className="text-error-500">
                *
              </span>
            </label>

            <input
              type="text"
              value={form.name}
              disabled={
                saving || nameLocked
              }
              onChange={(event) =>
                onChange(
                  (previous) => ({
                    ...previous,
                    name:
                      event.target.value,
                  })
                )
              }
              placeholder="Contoh: Supervisor IT"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800"
            />

            {nameLocked && (
              <p className="mt-2 text-theme-xs text-warning-600 dark:text-warning-400">
                Nama role bawaan
                tidak dapat diubah
                karena digunakan untuk
                pemeriksaan hak akses.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
              Deskripsi
            </label>

            <textarea
              value={form.description}
              disabled={saving}
              onChange={(event) =>
                onChange(
                  (previous) => ({
                    ...previous,
                    description:
                      event.target.value,
                  })
                )
              }
              maxLength={255}
              rows={5}
              placeholder="Jelaskan fungsi dan tanggung jawab role..."
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-theme-sm leading-6 text-gray-800 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />

            <p className="mt-2 text-right text-theme-xs text-gray-400">
              {form.description.length}
              /255
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Batal
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              !form.name.trim()
            }
            className="inline-flex min-w-[120px] items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Menyimpan..."
              : mode === "create"
                ? "Tambah Role"
                : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function RoleDetailModal({
  role,
  onClose,
  onEdit,
}: {
  role: Role;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <ModalWrapper onClose={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-theme-xl dark:bg-gray-900"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
              Detail Role
            </h2>

            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              Informasi role dan
              penggunaan akun.
            </p>
          </div>

          <CloseButton
            onClick={onClose}
          />
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-bold text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400">
              {getInitial(role.name)}
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
                {role.name}
              </h3>

              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-theme-xs font-medium ${role.isDefault
                  ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  }`}
              >
                {role.isDefault
                  ? "Role bawaan"
                  : "Role tambahan"}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <DetailItem
              label="Deskripsi"
              value={
                role.description ||
                "Belum ada deskripsi."
              }
            />

            <DetailItem
              label="Jumlah User"
              value={`${role.userCount} user`}
            />

            <DetailItem
              label="Tanggal Dibuat"
              value={formatDate(
                role.createdAt
              )}
            />

            <DetailItem
              label="Terakhir Diubah"
              value={formatDate(
                role.updatedAt
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-theme-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-semibold text-white hover:bg-brand-600"
          >
            Edit Role
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

function DeleteRoleModal({
  role,
  deleting,
  onClose,
  onConfirm,
}: {
  role: Role;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalWrapper onClose={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400">
          <TrashIcon />
        </div>

        <h2 className="mt-5 text-center text-xl font-bold text-gray-800 dark:text-white/90">
          Hapus Role?
        </h2>

        <p className="mt-3 text-center text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
          Role{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {role.name}
          </span>{" "}
          akan dihapus secara
          permanen.
        </p>

        {role.userCount > 0 && (
          <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-theme-xs text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-400">
            Role ini masih digunakan
            oleh {role.userCount} user
            dan tidak dapat dihapus.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-theme-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={
              deleting ||
              role.userCount > 0
            }
            className="rounded-lg bg-error-500 px-4 py-2.5 text-theme-sm font-semibold text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting
              ? "Menghapus..."
              : "Hapus Role"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

function ModalWrapper({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}

function CloseButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
      aria-label="Tutup modal"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

type SummaryColor =
  | "blue"
  | "purple"
  | "green"
  | "orange";

function SummaryCard({
  label,
  value,
  description,
  color,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  color: SummaryColor;
  icon: React.ReactNode;
}) {
  const styles = {
    blue: {
      icon:
        "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      value:
        "text-brand-600 dark:text-brand-400",
    },

    purple: {
      icon:
        "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
      value:
        "text-purple-600 dark:text-purple-400",
    },

    green: {
      icon:
        "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
      value:
        "text-success-700 dark:text-success-400",
    },

    orange: {
      icon:
        "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
      value:
        "text-warning-700 dark:text-warning-400",
    },
  };

  const style = styles[color];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.icon}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-theme-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p
          className={`text-3xl font-bold ${style.value}`}
        >
          {value}
        </p>

        <span className="text-right text-theme-xs text-gray-400">
          {description}
        </span>
      </div>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </th>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
      <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function MobileInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
      <p className="text-theme-xs text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat data role...
      </p>
    </div>
  );
}

function EmptyState({
  hasRoles,
  onAddRole,
}: {
  hasRoles: boolean;
  onAddRole: () => void;
}) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <ShieldIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        Role tidak ditemukan
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        {hasRoles
          ? "Tidak ada role yang sesuai dengan pencarian."
          : "Belum ada role yang tersedia pada sistem."}
      </p>

      {!hasRoles && (
        <button
          type="button"
          onClick={onAddRole}
          className="mt-5 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-semibold text-white"
        >
          Tambah Role
        </button>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        d="M12 5v14M5 12h14"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m5.25 2.25c0 4.97-3.58 8.842-8.25 9.75C7.33 20.842 3.75 16.97 3.75 12V5.25L12 2.25l8.25 3V12Z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.125a6.375 6.375 0 0 0-12.75 0M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Zm-4.5 10.5a5.25 5.25 0 0 1 6-5.196"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 10.5V7.875a3.75 3.75 0 0 1 7.5 0V10.5m-9 0h10.5A1.5 1.5 0 0 1 18.75 12v6.75a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z"
      />
    </svg>
  );
}

function CustomRoleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v18M3 12h18"
      />
    </svg>
  );
}

function UsersSmallIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-3.5 w-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.125a6.375 6.375 0 0 0-12.75 0M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z"
      />
    </svg>
  );
}

function LockSmallIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-3.5 w-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 10.5V7.875a3.75 3.75 0 0 1 7.5 0V10.5m-9 0h10.5A1.5 1.5 0 0 1 18.75 12v6.75a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5Z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-7 w-7"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-1.327L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0V4.477c0-1.18-.91-2.165-2.09-2.202a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.202v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-[18px] w-[18px]"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-[18px] w-[18px]"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.862 4.487Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 7.125 16.875 4.5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 13.5V19.5A1.5 1.5 0 0 1 16.5 21h-12A1.5 1.5 0 0 1 3 19.5v-12A1.5 1.5 0 0 1 4.5 6H10"
      />
    </svg>
  );
}

function ActionButton({
  title,
  onClick,
  variant,
  icon,
}: {
  title: string;
  onClick: () => void;
  variant: "view" | "edit" | "delete";
  icon: React.ReactNode;
}) {
  const styles = {
    view:
      "border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10",

    edit:
      "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800",

    delete:
      "border-error-200 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition dark:bg-gray-900 ${styles[variant]}`}
    >
      {icon}
    </button>
  );
}