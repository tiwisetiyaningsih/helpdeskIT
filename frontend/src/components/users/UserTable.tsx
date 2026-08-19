"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  deleteUser,
  getUsers,
  type User,
} from "@/services/user.service";

import UserDeleteModal from "./UserDeleteModal";
import UserModal from "./UserModal";

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE";

const ITEMS_PER_PAGE = 10;

function normalizeRoleName(
  roleName?: string
) {
  return String(roleName || "-")
    .trim();
}

function getRoleClass(
  roleName?: string
) {
  const normalized = String(
    roleName || ""
  )
    .trim()
    .toUpperCase();

  if (
    [
      "ADMIN",
      "ADMINISTRATOR",
    ].includes(normalized)
  ) {
    return "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400";
  }

  if (
    [
      "IT HELPDESK",
      "IT HELP DESK",
    ].includes(normalized)
  ) {
    return "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
  }

  return "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400";
}

function getInitial(
  name?: string
) {
  const value = String(
    name || ""
  ).trim();

  return (
    value.charAt(0).toUpperCase() ||
    "U"
  );
}

function formatDateTime(
  value?: string | null
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
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }
  ).format(date);
}

export default function UserTable() {
  const [
    users,
    setUsers,
  ] = useState<User[]>([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] = useState("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>("ALL");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    isFormOpen,
    setIsFormOpen,
  ] = useState(false);

  const [
    selectedUser,
    setSelectedUser,
  ] =
    useState<User | null>(null);

  const [
    viewUser,
    setViewUser,
  ] =
    useState<User | null>(null);

  const [
    deleteUserData,
    setDeleteUserData,
  ] =
    useState<User | null>(null);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<Date | null>(null);

  const loadUsers = useCallback(
    async (
      showLoading = false
    ) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        setError("");

        const data =
          await getUsers();

        setUsers(data);
        setLastUpdated(new Date());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Terjadi kesalahan saat mengambil data user."
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
    void loadUsers(true);

    const intervalId =
      window.setInterval(() => {
        void loadUsers(false);
      }, 10000);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [loadUsers]);


  useEffect(() => {
    if (!success) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        setSuccess("");
      }, 3000);

    return () => {
      window.clearTimeout(
        timeout
      );
    };
  }, [success]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    roleFilter,
    statusFilter,
  ]);

  const statistics =
    useMemo(() => {
      return {
        total: users.length,

        active:
          users.filter(
            (user) =>
              user.isActive
          ).length,

        inactive:
          users.filter(
            (user) =>
              !user.isActive
          ).length,

        admin:
          users.filter((user) =>
            [
              "ADMIN",
              "ADMINISTRATOR",
            ].includes(
              String(
                user.role?.name || ""
              )
                .trim()
                .toUpperCase()
            )
          ).length,

        helpdesk:
          users.filter((user) =>
            [
              "IT HELPDESK",
              "IT HELP DESK",
            ].includes(
              String(
                user.role?.name || ""
              )
                .trim()
                .toUpperCase()
            )
          ).length,
      };
    }, [users]);

  const roleOptions =
    useMemo(() => {
      return Array.from(
        new Set(
          users
            .map((user) =>
              normalizeRoleName(
                user.role?.name
              )
            )
            .filter(
              (role) =>
                role !== "-"
            )
        )
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "id-ID"
        )
      );
    }, [users]);

  const filteredUsers =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return users
        .filter((user) => {
          const employee =
            user.employee;

          const searchableText = [
            employee?.nik || "",
            employee?.nama || "",
            employee?.jabatan || "",
            employee?.unitKerja || "",
            employee?.jobTitle || "",
            user.email,
            user.role?.name || "",
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !keyword ||
            searchableText.includes(
              keyword
            );

          const matchesRole =
            roleFilter === "ALL" ||
            normalizeRoleName(
              user.role?.name
            ) === roleFilter;

          const matchesStatus =
            statusFilter === "ALL" ||
            (statusFilter ===
              "ACTIVE" &&
              user.isActive) ||
            (statusFilter ===
              "INACTIVE" &&
              !user.isActive);

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          );
        })
        .sort((userA, userB) => {
          if (
            userA.isActive !==
            userB.isActive
          ) {
            return userA.isActive
              ? -1
              : 1;
          }

          return String(
            userA.employee?.nama ||
            userA.email
          ).localeCompare(
            String(
              userB.employee?.nama ||
              userB.email
            ),
            "id-ID"
          );
        });
    }, [
      users,
      search,
      roleFilter,
      statusFilter,
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredUsers.length /
      ITEMS_PER_PAGE
    )
  );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const paginatedUsers =
    useMemo(() => {
      const start =
        (safeCurrentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredUsers.slice(
        start,
        start + ITEMS_PER_PAGE
      );
    }, [
      filteredUsers,
      safeCurrentPage,
    ]);

  const firstShown =
    filteredUsers.length === 0
      ? 0
      : (safeCurrentPage - 1) *
      ITEMS_PER_PAGE +
      1;

  const lastShown = Math.min(
    safeCurrentPage *
    ITEMS_PER_PAGE,
    filteredUsers.length
  );

  function handleAdd() {
    setSelectedUser(null);
    setIsFormOpen(true);
  }

  function handleEdit(
    user: User
  ) {
    setSelectedUser(user);
    setViewUser(null);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setSelectedUser(null);
  }

  async function handleFormSuccess(
    message: string
  ) {
    handleCloseForm();
    setSuccess(message);
    await loadUsers(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteUserData) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await deleteUser(
        deleteUserData.id
      );

      setDeleteUserData(null);
      setSuccess(
        "User berhasil dihapus."
      );

      await loadUsers(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus user."
      );
    } finally {
      setDeleting(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  }

  return (
    <>
      <div className="space-y-5 pb-8">
        {/* Header */}
        <section className="relative overflow-hidden rounded-2xl border border-brand-100 bg-white px-6 py-6 shadow-theme-xs dark:border-brand-500/20 dark:bg-white/[0.03]">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] overflow-hidden lg:block">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-50 dark:bg-brand-500/10" />

            <div
              className="absolute bottom-6 left-4 h-20 w-44 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(70,95,255,0.28) 1.5px, transparent 1.5px)",
                backgroundSize:
                  "16px 16px",
              }}
            />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <span className="h-2 w-2 rounded-full bg-brand-500" />

                Master Data
              </div>

              <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-white/90 sm:text-3xl">
                Manajemen User
              </h1>

              <p className="mt-2 max-w-2xl text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
                Kelola akun pengguna,
                status akun, employee
                terkait, serta role dan hak
                akses aplikasi Help Desk IT.
              </p>
            </div>

            <div className="flex">
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white transition hover:bg-brand-600"
              >
                <PlusIcon />

                Tambah User
              </button>
            </div>
          </div>
        </section>

        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-success-200 bg-success-50 px-5 py-4 text-theme-sm font-medium text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
            <CheckCircleIcon />

            {success}
          </div>
        )}

        {error && (
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-error-200 bg-error-50 px-5 py-4 dark:border-error-500/30 dark:bg-error-500/10 sm:flex-row sm:items-center">
            <p className="text-theme-sm font-medium text-error-700 dark:text-error-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadUsers(true)
              }
              className="text-left text-theme-sm font-semibold text-error-700 underline dark:text-error-400"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatisticCard
            label="Total User"
            value={statistics.total}
            description="Seluruh akun"
            color="blue"
            icon={<UsersIcon />}
          />

          <StatisticCard
            label="User Aktif"
            value={statistics.active}
            description="Dapat login"
            color="green"
            icon={<ActiveIcon />}
          />

          <StatisticCard
            label="User Nonaktif"
            value={statistics.inactive}
            description="Akses dibatasi"
            color="red"
            icon={<InactiveIcon />}
          />

          <StatisticCard
            label="Administrator"
            value={statistics.admin}
            description="Akses admin"
            color="orange"
            icon={<ShieldIcon />}
          />

          <StatisticCard
            label="IT HelpDesk"
            value={statistics.helpdesk}
            description="Petugas ticket"
            color="purple"
            icon={<HelpdeskIcon />}
          />
        </div>

        {/* Table section */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">
                  Daftar User
                </h2>

                <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                  Menampilkan{" "}
                  {
                    filteredUsers.length
                  }{" "}
                  dari {users.length} user.
                </p>
              </div>

              <div className="relative w-full xl:w-[390px]">
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
                  placeholder="Cari nama, NIK, email, unit, atau role..."
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-11 pr-4 text-theme-sm text-gray-800 shadow-theme-xs outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <option value="ALL">Semua Role</option>

                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>

                <svg
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M6 8l4 4 4-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>

                <svg
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M6 8l4 4 4-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-5 text-theme-sm font-semibold text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <ResetIcon />
                Reset
              </button>
            </div>

            <p className="mt-3 text-theme-xs text-gray-400">
              Terakhir diperbarui:{" "}
              {lastUpdated
                ? formatDateTime(
                  lastUpdated.toISOString()
                )
                : "Belum diperbarui"}
            </p>
          </div>

          {loading ? (
            <LoadingState />
          ) : paginatedUsers.length ===
            0 ? (
            <EmptyState
              hasUsers={
                users.length > 0
              }
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1120px] table-fixed">
                  <colgroup>
                    <col className="w-[25%]" />
                    <col className="w-[24%]" />
                    <col className="w-[17%]" />
                    <col className="w-[13%]" />
                    <col className="w-[21%]" />
                  </colgroup>

                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <TableHeader>
                        User
                      </TableHeader>

                      <TableHeader>
                        Employee
                      </TableHeader>

                      <TableHeader>
                        Role
                      </TableHeader>

                      <TableHeader align="center">
                        Status
                      </TableHeader>

                      <TableHeader align="center">
                        Aksi
                      </TableHeader>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedUsers.map(
                      (user, index) => {
                        const employee =
                          user.employee;

                        const userName =
                          employee?.nama ||
                          user.email;

                        return (
                          <tr
                            key={user.id}
                            className={`border-b border-gray-100 transition hover:bg-brand-50/60 dark:border-gray-800 dark:hover:bg-brand-500/[0.05] ${index % 2 ===
                              0
                              ? "bg-white dark:bg-transparent"
                              : "bg-gray-50/60 dark:bg-white/[0.02]"
                              }`}
                          >
                            <TableCell>
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                                  {getInitial(
                                    userName
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p
                                    title={
                                      userName
                                    }
                                    className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90"
                                  >
                                    {userName}
                                  </p>

                                  <p
                                    title={
                                      user.email
                                    }
                                    className="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400"
                                  >
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <p className="truncate text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                                NIK{" "}
                                {employee?.nik ||
                                  "-"}
                              </p>

                              <p
                                title={
                                  employee?.jobTitle ||
                                  employee?.jabatan ||
                                  "-"
                                }
                                className="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400"
                              >
                                {employee?.jobTitle ||
                                  employee?.jabatan ||
                                  "-"}
                              </p>

                              <p
                                title={
                                  employee?.unitKerja ||
                                  "-"
                                }
                                className="mt-1 truncate text-theme-xs text-gray-400"
                              >
                                {employee?.unitKerja ||
                                  "-"}
                              </p>
                            </TableCell>

                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getRoleClass(
                                  user.role
                                    ?.name
                                )}`}
                              >
                                {normalizeRoleName(
                                  user.role
                                    ?.name
                                )}
                              </span>
                            </TableCell>

                            <TableCell align="center">
                              <StatusBadge
                                active={
                                  user.isActive
                                }
                              />
                            </TableCell>

                            <TableCell align="center">
                              <div className="flex items-center justify-center gap-2">
                                <ActionButton
                                  title="Lihat detail"
                                  onClick={() =>
                                    setViewUser(
                                      user
                                    )
                                  }
                                  variant="view"
                                  icon={
                                    <EyeIcon />
                                  }
                                />

                                <ActionButton
                                  title="Edit user"
                                  onClick={() =>
                                    handleEdit(
                                      user
                                    )
                                  }
                                  variant="edit"
                                  icon={
                                    <EditIcon />
                                  }
                                />

                                <ActionButton
                                  title="Hapus user"
                                  onClick={() =>
                                    setDeleteUserData(
                                      user
                                    )
                                  }
                                  variant="delete"
                                  icon={
                                    <TrashIcon />
                                  }
                                />
                              </div>
                            </TableCell>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="space-y-4 p-4 xl:hidden">
                {paginatedUsers.map(
                  (user) => {
                    const employee =
                      user.employee;

                    const userName =
                      employee?.nama ||
                      user.email;

                    return (
                      <article
                        key={user.id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                              {getInitial(
                                userName
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                                {userName}
                              </h3>

                              <p className="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          <StatusBadge
                            active={
                              user.isActive
                            }
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <MobileInfo
                            label="NIK"
                            value={
                              employee?.nik ||
                              "-"
                            }
                          />

                          <MobileInfo
                            label="Role"
                            value={normalizeRoleName(
                              user.role?.name
                            )}
                          />

                          <MobileInfo
                            label="Jabatan"
                            value={
                              employee?.jobTitle ||
                              employee?.jabatan ||
                              "-"
                            }
                          />

                          <MobileInfo
                            label="Unit Kerja"
                            value={
                              employee?.unitKerja ||
                              "-"
                            }
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setViewUser(
                                user
                              )
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 px-3 py-2.5 text-theme-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-500/30 dark:text-brand-400"
                          >
                            <EyeIcon />

                            Lihat
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                user
                              )
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-theme-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                          >
                            <EditIcon />

                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteUserData(
                                user
                              )
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-error-200 px-3 py-2.5 text-theme-xs font-semibold text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400"
                          >
                            <TrashIcon />

                            Hapus
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                  Menampilkan{" "}
                  {firstShown}–
                  {lastShown} dari{" "}
                  {
                    filteredUsers.length
                  }{" "}
                  user.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      safeCurrentPage <=
                      1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (previous) =>
                          Math.max(
                            1,
                            previous -
                            1
                          )
                      )
                    }
                    className={
                      paginationButtonClass
                    }
                  >
                    Sebelumnya
                  </button>

                  <span className="inline-flex h-9 min-w-[84px] items-center justify-center rounded-lg bg-brand-50 px-3 text-theme-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    {safeCurrentPage} /{" "}
                    {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      safeCurrentPage >=
                      totalPages
                    }
                    onClick={() =>
                      setCurrentPage(
                        (previous) =>
                          Math.min(
                            totalPages,
                            previous +
                            1
                          )
                      )
                    }
                    className={
                      paginationButtonClass
                    }
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <UserModal
        isOpen={isFormOpen}
        user={selectedUser}
        onClose={handleCloseForm}
        onSuccess={
          handleFormSuccess
        }
      />

      <UserDeleteModal
        user={deleteUserData}
        deleting={deleting}
        onClose={() =>
          setDeleteUserData(null)
        }
        onConfirm={
          handleDeleteConfirm
        }
      />

      {viewUser && (
        <UserDetailModal
          user={viewUser}
          onClose={() =>
            setViewUser(null)
          }
          onEdit={() =>
            handleEdit(viewUser)
          }
        />
      )}
    </>
  );
}

const filterClass =
  "h-11 min-w-0 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm text-gray-700 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

const paginationButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-theme-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

function StatisticCard({
  label,
  value,
  description,
  color,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  color:
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "purple";
  icon: React.ReactNode;
}) {
  const styles = {
    blue: {
      icon:
        "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
      value:
        "text-brand-600 dark:text-brand-400",
    },

    green: {
      icon:
        "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
      value:
        "text-success-700 dark:text-success-400",
    },

    red: {
      icon:
        "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
      value:
        "text-error-600 dark:text-error-400",
    },

    orange: {
      icon:
        "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
      value:
        "text-warning-700 dark:text-warning-400",
    },

    purple: {
      icon:
        "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
      value:
        "text-purple-600 dark:text-purple-400",
    },
  };

  const currentStyle =
    styles[color];

  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${currentStyle.icon}`}
      >
        {icon}
      </div>

      <p className="mt-3 truncate text-theme-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold ${currentStyle.value}`}
      >
        {value}
      </p>

      <p className="mt-1 truncate text-[11px] text-gray-400">
        {description}
      </p>
    </div>
  );
}

function UserDetailModal({
  user,
  onClose,
  onEdit,
}: {
  user: User;
  onClose: () => void;
  onEdit: () => void;
}) {
  const employee =
    user.employee;

  const userName =
    employee?.nama ||
    user.email;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Detail User
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Informasi akun dan
              employee yang terhubung.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-5 text-center dark:border-brand-500/20 dark:bg-brand-500/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-bold text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-400">
              {getInitial(userName)}
            </div>

            <h3 className="mt-3 text-lg font-bold text-gray-800 dark:text-white/90">
              {userName}
            </h3>

            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              {user.email}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-theme-xs font-semibold ${getRoleClass(
                  user.role?.name
                )}`}
              >
                {normalizeRoleName(
                  user.role?.name
                )}
              </span>

              <StatusBadge
                active={
                  user.isActive
                }
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem
              label="NIK"
              value={
                employee?.nik || "-"
              }
            />

            <DetailItem
              label="Nama Employee"
              value={
                employee?.nama || "-"
              }
            />

            <DetailItem
              label="Position"
              value={
                employee?.jabatan ||
                "-"
              }
            />

            <DetailItem
              label="Job Title"
              value={
                employee?.jobTitle ||
                "-"
              }
            />

            <DetailItem
              label="Unit Kerja"
              value={
                employee?.unitKerja ||
                "-"
              }
            />

            <DetailItem
              label="Status Employee"
              value={
                employee?.isActive ===
                  false
                  ? "Nonaktif"
                  : "Aktif"
              }
            />

            {"createdAt" in user && (
              <DetailItem
                label="Akun Dibuat"
                value={formatDateTime(
                  String(
                    user.createdAt ||
                    ""
                  )
                )}
              />
            )}

            {"lastLogin" in user && (
              <DetailItem
                label="Login Terakhir"
                value={formatDateTime(
                  String(
                    user.lastLogin ||
                    ""
                  )
                )}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-theme-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-theme-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <EditIcon />

            Edit User
          </button>
        </div>
      </div>
    </div>
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
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-2 break-words text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold ${active
        ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
        : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
        }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {active
        ? "Aktif"
        : "Nonaktif"}
    </span>
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
  variant:
  | "view"
  | "edit"
  | "delete";
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

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?:
  | "left"
  | "center";
}) {
  return (
    <th
      className={`px-4 py-4 text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 ${align === "center"
        ? "text-center"
        : "text-left"
        }`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?:
  | "left"
  | "center";
}) {
  return (
    <td
      className={`overflow-hidden px-4 py-4 align-middle text-theme-sm text-gray-600 dark:text-gray-300 ${align === "center"
        ? "text-center"
        : "text-left"
        }`}
    >
      {children}
    </td>
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
      <p className="text-theme-xs uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-500" />

      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Memuat data user...
      </p>
    </div>
  );
}

function EmptyState({
  hasUsers,
}: {
  hasUsers: boolean;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
        <UsersIcon />
      </div>

      <h3 className="mt-4 font-semibold text-gray-800 dark:text-white/90">
        User tidak ditemukan
      </h3>

      <p className="mt-2 max-w-sm text-theme-sm leading-6 text-gray-500 dark:text-gray-400">
        {hasUsers
          ? "Tidak ada user yang sesuai dengan pencarian atau filter."
          : "Belum ada akun user yang tersimpan pada sistem."}
      </p>
    </div>
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
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128A6.375 6.375 0 0 0 2.25 19.125 12.318 12.318 0 0 0 8.624 21c2.331 0 4.512-.645 6.376-1.766M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.5 12 2.25 2.25 4.75-5"
      />
    </svg>
  );
}

function InactiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        d="M8.75 12h6.5"
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
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m5.25 2.25c0 4.97-3.58 8.842-8.25 9.75C7.33 20.842 3.75 16.97 3.75 12V5.25L12 2.25l8.25 3V12Z"
      />
    </svg>
  );
}

function HelpdeskIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12a7.5 7.5 0 0 1 15 0v3.75A2.25 2.25 0 0 1 17.25 18H15v-6h4.5M4.5 12H9v6H6.75a2.25 2.25 0 0 1-2.25-2.25V12Zm6.75 7.5h3.75"
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

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
      />

      <circle
        cx="12"
        cy="12"
        r="2.25"
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
      strokeWidth={1.7}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
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
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-1.327L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-10.978.397a48.11 48.11 0 0 1 3.478-.397m7.5 0V4.477c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        d="M12 5.25v13.5M18.75 12H5.25"
      />
    </svg>
  );
}


function ResetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992V4.356m-.463 5.455a9 9 0 1 0 2.13 9.467"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="h-5 w-5 shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.5 12 2.25 2.25 4.75-5"
      />
    </svg>
  );
}